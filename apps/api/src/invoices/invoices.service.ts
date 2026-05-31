import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  Prisma,
  StockMovementType,
} from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { GoldRatesService } from '../gold-rates/gold-rates.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  assertCanAccessTenant,
  resolveTenantFilter,
} from '../common/tenant-context.helper';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goldRates: GoldRatesService,
  ) {}

  /**
   * إنشاء فاتورة كاملة من POS (مع بنود + دفعات + استبدال ذهب قديم)
   * كل العمليات في معاملة واحدة لضمان الـ ACID
   */
  async create(dto: CreateInvoiceDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);

    if (!dto.items?.length) {
      throw new BadRequestException('الفاتورة يجب أن تحتوي بنداً واحداً على الأقل');
    }

    // التحقق من الفرع
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId: targetTenantId },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    // جلب كل المنتجات دفعة واحدة
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId: targetTenantId,
        deletedAt: null,
      },
      include: { stones: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('بعض المنتجات غير موجودة');
    }

    // التحقق من أن المنتجات قابلة للبيع
    for (const product of products) {
      if (product.status !== 'IN_STOCK') {
        throw new BadRequestException(
          `المنتج ${product.sku} ليس متاحاً للبيع (الحالة: ${product.status})`,
        );
      }
    }

    // حساب البنود (بدون الـ DB transactions بعد لتقليل المعاملة)
    const itemsCalculated = await Promise.all(
      dto.items.map(async (input) => {
        const product = products.find((p) => p.id === input.productId)!;

        // حساب السعر
        let unitPrice = new Decimal(0);
        let goldValue = new Decimal(0);
        let stonesValue = new Decimal(0);
        let makingCharge = new Decimal(0);
        let goldRateUsed: Decimal | null = null;

        if (input.overridePrice !== undefined) {
          unitPrice = new Decimal(input.overridePrice);
        } else if (product.pricingMode === 'FIXED' && product.fixedSalePrice) {
          unitPrice = new Decimal(product.fixedSalePrice.toString());
        } else {
          // DYNAMIC أو HYBRID
          const rate = await this.goldRates.getCurrentRate({
            tenantId: targetTenantId,
            metalType: product.metalType,
            karat: product.karat,
            branchId: dto.branchId,
          });
          if (!rate) {
            throw new BadRequestException(
              `لا يوجد سعر ذهب لـ ${product.karat}. أدخل السعر اليومي أولاً.`,
            );
          }
          goldRateUsed = new Decimal(rate.ratePerGram.toString());
          goldValue = new Decimal(product.netWeight.toString()).mul(goldRateUsed);

          stonesValue = product.stones.reduce((acc, s) => {
            if (s.totalValue) return acc.plus(s.totalValue.toString());
            if (s.pricePerCarat) {
              return acc.plus(
                new Decimal(s.pricePerCarat.toString()).mul(s.caratWeight.toString()),
              );
            }
            return acc;
          }, new Decimal(0));

          makingCharge = new Decimal(product.makingCharge.toString()).plus(
            new Decimal(product.makingChargePerGram.toString()).mul(
              product.netWeight.toString(),
            ),
          );

          const safetyAmount = goldValue
            .plus(stonesValue)
            .plus(makingCharge)
            .mul(new Decimal(product.safetyMarginPct.toString()))
            .div(100);

          unitPrice = goldValue.plus(stonesValue).plus(makingCharge).plus(safetyAmount);

          // HYBRID — السعر الفعلي = max(محسوب، ثابت)
          if (product.pricingMode === 'HYBRID' && product.fixedSalePrice) {
            unitPrice = Decimal.max(
              unitPrice,
              new Decimal(product.fixedSalePrice.toString()),
            );
          }
        }

        const quantity = input.quantity ?? 1;
        const discountAmount = new Decimal(input.discountAmount ?? 0);
        const lineTotal = unitPrice.mul(quantity).minus(discountAmount);

        return {
          product,
          input,
          quantity,
          unitPrice,
          goldRateUsed,
          goldValue,
          stonesValue,
          makingCharge,
          discountAmount,
          lineTotal,
        };
      }),
    );

    // حساب المجموع
    const subtotal = itemsCalculated.reduce(
      (acc, i) => acc.plus(i.lineTotal),
      new Decimal(0),
    );
    const discountOnTotal = new Decimal(dto.discountAmount ?? 0);

    // قيمة الذهب القديم
    const oldGoldValue = (dto.oldGoldItems ?? []).reduce(
      (acc, og) => acc.plus(new Decimal(og.weight).mul(og.ratePerGram)),
      new Decimal(0),
    );

    const vatRate = new Decimal(dto.vatRate ?? 5);
    // VAT يُحسب فقط على أجرة الصياغة (سياسة دول الخليج للذهب)
    const totalMakingCharges = itemsCalculated.reduce(
      (acc, i) => acc.plus(i.makingCharge),
      new Decimal(0),
    );
    const vatAmount = totalMakingCharges.mul(vatRate).div(100);

    const total = subtotal
      .minus(discountOnTotal)
      .plus(vatAmount)
      .minus(oldGoldValue);

    // المدفوع
    const paidAmount = (dto.payments ?? []).reduce(
      (acc, p) => acc.plus(p.amount),
      new Decimal(0),
    );

    const dueAmount = Decimal.max(total.minus(paidAmount), new Decimal(0));
    const changeAmount = Decimal.max(paidAmount.minus(total), new Decimal(0));

    // تحديد الحالة
    let status: InvoiceStatus = 'DRAFT';
    if (dueAmount.lessThanOrEqualTo(0.001)) {
      status = 'PAID';
    } else if (paidAmount.greaterThan(0)) {
      status = 'PARTIAL';
    } else {
      status = 'UNPAID';
    }

    // توليد رقم الفاتورة
    const invoiceNo = await this.generateInvoiceNo(targetTenantId);

    // المعاملة الذرية
    return this.prisma.$transaction(async (tx) => {
      // 1. إنشاء الفاتورة
      const invoice = await tx.invoice.create({
        data: {
          tenantId: targetTenantId,
          invoiceNo,
          branchId: dto.branchId,
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          salespersonId: user.userId,
          cashierId: user.userId,
          subtotal: new Prisma.Decimal(subtotal.toFixed(4)),
          discountAmount: new Prisma.Decimal(discountOnTotal.toFixed(4)),
          discountReason: dto.discountReason,
          vatRate: new Prisma.Decimal(vatRate.toFixed(2)),
          vatAmount: new Prisma.Decimal(vatAmount.toFixed(4)),
          oldGoldValue: new Prisma.Decimal(oldGoldValue.toFixed(4)),
          total: new Prisma.Decimal(total.toFixed(4)),
          paidAmount: new Prisma.Decimal(paidAmount.toFixed(4)),
          changeAmount: new Prisma.Decimal(changeAmount.toFixed(4)),
          dueAmount: new Prisma.Decimal(dueAmount.toFixed(4)),
          status,
          notes: dto.notes,
          items: {
            create: itemsCalculated.map((i) => ({
              productId: i.product.id,
              productSku: i.product.sku,
              productName: i.product.name,
              productNameAr: i.product.nameAr,
              metalType: i.product.metalType,
              karat: i.product.karat,
              netWeight: i.product.netWeight,
              goldRateUsed: i.goldRateUsed
                ? new Prisma.Decimal(i.goldRateUsed.toFixed(4))
                : null,
              goldValue: new Prisma.Decimal(i.goldValue.toFixed(4)),
              stonesValue: new Prisma.Decimal(i.stonesValue.toFixed(4)),
              makingCharge: new Prisma.Decimal(i.makingCharge.toFixed(4)),
              discountAmount: new Prisma.Decimal(i.discountAmount.toFixed(4)),
              discountReason: i.input.discountReason,
              unitPrice: new Prisma.Decimal(i.unitPrice.toFixed(4)),
              quantity: i.quantity,
              lineTotal: new Prisma.Decimal(i.lineTotal.toFixed(4)),
              notes: i.input.notes,
            })),
          },
          payments: dto.payments?.length
            ? {
                create: dto.payments.map((p) => ({
                  tenantId: targetTenantId,
                  method: p.method,
                  amount: new Prisma.Decimal(p.amount),
                  reference: p.reference,
                  notes: p.notes,
                  receivedById: user.userId,
                })),
              }
            : undefined,
          oldGoldItems: dto.oldGoldItems?.length
            ? {
                create: dto.oldGoldItems.map((og) => ({
                  weight: new Prisma.Decimal(og.weight),
                  karat: og.karat,
                  ratePerGram: new Prisma.Decimal(og.ratePerGram),
                  valueDeducted: new Prisma.Decimal(
                    new Decimal(og.weight).mul(og.ratePerGram).toFixed(4),
                  ),
                  description: og.description,
                })),
              }
            : undefined,
        },
        include: {
          items: true,
          payments: true,
          oldGoldItems: true,
          customer: { select: { id: true, name: true, nameAr: true, phone: true } },
          branch: { select: { id: true, code: true, name: true, nameAr: true } },
        },
      });

      // 2. تحديث حالة المنتجات إلى SOLD وتسجيل حركات المخزون
      for (const item of itemsCalculated) {
        await tx.product.update({
          where: { id: item.product.id },
          data: { status: 'SOLD' },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: targetTenantId,
            productId: item.product.id,
            branchId: dto.branchId,
            movementType: StockMovementType.SALE,
            quantity: -item.quantity,
            weightChange: new Prisma.Decimal(
              new Decimal(item.product.netWeight.toString())
                .mul(-item.quantity)
                .toFixed(4),
            ),
            referenceType: 'Invoice',
            referenceId: invoice.id,
            performedById: user.userId,
          },
        });
      }

      // 3. تحديث رصيد العميل (إن وُجد)
      if (dto.customerId) {
        const earnedPoints = Math.floor(total.toNumber() / 10); // 1 نقطة لكل 10 ر.ع
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            totalPurchases: { increment: total.toNumber() },
            loyaltyPoints: { increment: earnedPoints },
            outstandingBalance: dueAmount.greaterThan(0)
              ? { increment: dueAmount.toNumber() }
              : undefined,
          },
        });
      }

      this.logger.log(
        `✅ Invoice ${invoiceNo} created (total: ${total.toFixed(3)}, status: ${status})`,
      );

      return invoice;
    });
  }

  async findAll(
    query: { branchId?: string; customerId?: string; status?: InvoiceStatus; page?: number; pageSize?: number },
    user: AuthUser,
    tenantId?: string,
  ) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.InvoiceWhereInput = {
      tenantId: targetTenantId,
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, nameAr: true, phone: true } },
          branch: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { orderBy: { receivedAt: 'desc' } },
        oldGoldItems: true,
        customer: true,
        branch: true,
      },
    });
    if (!invoice) throw new NotFoundException('الفاتورة غير موجودة');
    assertCanAccessTenant(user, invoice.tenantId);
    return invoice;
  }

  /**
   * إلغاء فاتورة (مع إرجاع المنتجات للمخزون)
   */
  async cancel(id: string, reason: string, user: AuthUser) {
    const invoice = await this.findOne(id, user);
    if (invoice.status === 'CANCELED') {
      throw new BadRequestException('الفاتورة ملغاة بالفعل');
    }

    return this.prisma.$transaction(async (tx) => {
      // إعادة المنتجات للمخزون
      for (const item of invoice.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { status: 'IN_STOCK' },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: invoice.tenantId,
            productId: item.productId,
            branchId: invoice.branchId,
            movementType: StockMovementType.RETURN_IN,
            quantity: item.quantity,
            weightChange: item.netWeight,
            referenceType: 'InvoiceCanceled',
            referenceId: invoice.id,
            reason,
            performedById: user.userId,
          },
        });
      }

      // عكس رصيد العميل
      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            totalPurchases: { decrement: invoice.total.toNumber() },
            outstandingBalance: invoice.dueAmount.greaterThan(0)
              ? { decrement: invoice.dueAmount.toNumber() }
              : undefined,
          },
        });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelReason: reason,
        },
      });
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async generateInvoiceNo(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const count = await this.prisma.invoice.count({
      where: { tenantId, invoiceNo: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }
}
