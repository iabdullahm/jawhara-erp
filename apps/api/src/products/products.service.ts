import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { GoldRatesService } from '../gold-rates/gold-rates.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goldRatesService: GoldRatesService,
  ) {}

  /**
   * إنشاء منتج جديد (قطعة مجوهرات).
   * - يولّد SKU و Barcode تلقائياً إذا لم يُحددا
   * - يتحقق من أن netWeight + stoneWeight = grossWeight (مع تسامح بسيط)
   * - يُسجّل حركة مخزون "PURCHASE" تلقائياً
   * - ينشئ الأحجار المرتبطة في نفس المعاملة
   */
  async create(dto: CreateProductDto) {
    // التحقق المنطقي من الأوزان
    const gross = new Decimal(dto.grossWeight);
    const net = new Decimal(dto.netWeight);
    const stone = new Decimal(dto.stoneWeight ?? 0);
    const computedGross = net.plus(stone);
    if (computedGross.minus(gross).abs().greaterThan(0.01)) {
      throw new BadRequestException(
        `وزن المعدن (${net}) + وزن الأحجار (${stone}) = ${computedGross} لا يساوي الوزن الإجمالي (${gross})`,
      );
    }

    // التحقق من وجود الفرع والتصنيف
    await this.ensureBranchExists(dto.branchId);
    await this.ensureCategoryExists(dto.categoryId);

    // توليد SKU و Barcode تلقائياً عند الحاجة
    const sku = dto.sku ?? (await this.generateSku(dto.metalType, dto.karat));
    const barcode = dto.barcode ?? this.generateBarcode(sku);

    // التحقق من عدم تكرار SKU/Barcode
    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [
          { sku },
          { barcode },
          ...(dto.rfidTag ? [{ rfidTag: dto.rfidTag }] : []),
        ],
      },
    });
    if (existing) {
      throw new ConflictException(`SKU أو Barcode مستخدم بالفعل: ${sku}`);
    }

    // إنشاء المنتج + الأحجار + حركة المخزون في معاملة واحدة
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku,
          barcode,
          rfidTag: dto.rfidTag,
          name: dto.name,
          nameAr: dto.nameAr,
          description: dto.description,
          descriptionAr: dto.descriptionAr,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
          branchId: dto.branchId,
          metalType: dto.metalType,
          karat: dto.karat,
          grossWeight: new Prisma.Decimal(dto.grossWeight),
          netWeight: new Prisma.Decimal(dto.netWeight),
          stoneWeight: new Prisma.Decimal(dto.stoneWeight ?? 0),
          sellingUnit: dto.sellingUnit ?? 'GRAM',
          makingCharge: new Prisma.Decimal(dto.makingCharge ?? 0),
          makingChargePerGram: new Prisma.Decimal(dto.makingChargePerGram ?? 0),
          fixedSalePrice: dto.fixedSalePrice
            ? new Prisma.Decimal(dto.fixedSalePrice)
            : null,
          costPrice: dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null,
          hallmark: dto.hallmark,
          hallmarkedAt: dto.hallmarkedAt ? new Date(dto.hallmarkedAt) : null,
          hallmarkAuthority: dto.hallmarkAuthority,
          status: dto.status ?? 'IN_STOCK',
          ownershipType: dto.ownershipType ?? 'OWNED',
          primaryImageUrl: dto.primaryImageUrl,
          imageUrls: dto.imageUrls ?? [],
          designCode: dto.designCode,
          size: dto.size,
          occasion: dto.occasion,
          notes: dto.notes,
          notesAr: dto.notesAr,
          receivedAt: new Date(),
          stones: dto.stones?.length
            ? {
                create: dto.stones.map((s) => ({
                  stoneType: s.stoneType,
                  stoneTypeAr: s.stoneTypeAr,
                  count: s.count,
                  caratWeight: new Prisma.Decimal(s.caratWeight),
                  clarity: s.clarity,
                  color: s.color,
                  cut: s.cut,
                  shape: s.shape,
                  certificateNo: s.certificateNo,
                  certificateUrl: s.certificateUrl,
                  pricePerCarat: s.pricePerCarat
                    ? new Prisma.Decimal(s.pricePerCarat)
                    : null,
                  totalValue: s.totalValue
                    ? new Prisma.Decimal(s.totalValue)
                    : null,
                })),
              }
            : undefined,
        },
        include: {
          category: true,
          branch: true,
          supplier: true,
          stones: true,
        },
      });

      // تسجيل حركة مخزون افتتاحية
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          branchId: product.branchId,
          movementType: StockMovementType.PURCHASE,
          quantity: 1,
          weightChange: product.netWeight,
          referenceType: 'InitialEntry',
          notes: 'إدخال منتج جديد للمخزون',
        },
      });

      this.logger.log(`✅ Product created: ${product.sku}`);
      return product;
    });
  }

  /**
   * استرجاع قائمة المنتجات مع فلترة وبحث وتصفح.
   */
  async findAll(query: QueryProductsDto) {
    const {
      search,
      categoryId,
      branchId,
      supplierId,
      metalType,
      karat,
      status,
      ownershipType,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(branchId && { branchId }),
      ...(supplierId && { supplierId }),
      ...(metalType && { metalType }),
      ...(karat && { karat }),
      ...(status && { status }),
      ...(ownershipType && { ownershipType }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameAr: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { rfidTag: { contains: search, mode: 'insensitive' } },
          { designCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, nameAr: true } },
          branch: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true } },
          _count: { select: { stones: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
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

  /**
   * استرجاع منتج بالـ ID مع كل التفاصيل.
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        branch: true,
        supplier: true,
        stones: true,
        stockMovements: {
          orderBy: { movementDate: 'desc' },
          take: 50,
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`المنتج غير موجود: ${id}`);
    }
    return product;
  }

  /**
   * استرجاع منتج بالباركود (لشاشة POS).
   */
  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ barcode }, { sku: barcode }, { rfidTag: barcode }],
        deletedAt: null,
      },
      include: {
        category: true,
        branch: true,
        stones: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`لم يتم العثور على منتج بالكود: ${barcode}`);
    }
    return product;
  }

  /**
   * حساب السعر الحالي للمنتج بناءً على سعر الذهب اليومي.
   * السعر = (وزن المعدن × سعر الذهب للعيار) + قيمة الأحجار + أجرة الصياغة
   */
  async calculateCurrentPrice(id: string) {
    const product = await this.findOne(id);

    // إذا كان للقطعة سعر بيع ثابت، نعيده مباشرة
    if (product.fixedSalePrice) {
      return {
        productId: id,
        method: 'fixed',
        finalPrice: product.fixedSalePrice.toNumber(),
        breakdown: {
          fixedPrice: product.fixedSalePrice.toNumber(),
        },
      };
    }

    // الحصول على سعر الذهب الحالي للعيار
    const goldRate = await this.goldRatesService.getCurrentRate({
      metalType: product.metalType,
      karat: product.karat,
      branchId: product.branchId,
    });
    if (!goldRate) {
      throw new BadRequestException(
        `لا يوجد سعر ذهب محدد لعيار ${product.karat}. يجب إدخال السعر اليومي أولاً.`,
      );
    }

    const netWeight = new Decimal(product.netWeight.toString());
    const ratePerGram = new Decimal(goldRate.ratePerGram.toString());
    const goldValue = netWeight.mul(ratePerGram);

    // قيمة الأحجار (مجموع totalValue)
    const stonesValue = product.stones.reduce((acc, s) => {
      if (s.totalValue) return acc.plus(s.totalValue.toString());
      if (s.pricePerCarat) {
        return acc.plus(
          new Decimal(s.pricePerCarat.toString()).mul(s.caratWeight.toString()),
        );
      }
      return acc;
    }, new Decimal(0));

    // أجرة الصياغة (إما مقطوعة أو بالجرام)
    const makingChargeFlat = new Decimal(product.makingCharge.toString());
    const makingPerGram = new Decimal(
      product.makingChargePerGram.toString(),
    ).mul(netWeight);
    const totalMaking = makingChargeFlat.plus(makingPerGram);

    const subtotal = goldValue.plus(stonesValue).plus(totalMaking);

    return {
      productId: id,
      method: 'computed',
      goldRate: {
        karat: product.karat,
        ratePerGram: ratePerGram.toNumber(),
        currency: goldRate.currency,
        effectiveDate: goldRate.effectiveDate,
      },
      breakdown: {
        netWeight: netWeight.toNumber(),
        goldValue: goldValue.toNumber(),
        stonesValue: stonesValue.toNumber(),
        makingCharge: totalMaking.toNumber(),
        subtotal: subtotal.toNumber(),
      },
      finalPrice: subtotal.toNumber(),
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // throws if not found

    const data: Prisma.ProductUpdateInput = { ...dto } as any;
    if (dto.grossWeight !== undefined)
      data.grossWeight = new Prisma.Decimal(dto.grossWeight);
    if (dto.netWeight !== undefined)
      data.netWeight = new Prisma.Decimal(dto.netWeight);
    if (dto.stoneWeight !== undefined)
      data.stoneWeight = new Prisma.Decimal(dto.stoneWeight);
    if (dto.makingCharge !== undefined)
      data.makingCharge = new Prisma.Decimal(dto.makingCharge);
    if (dto.makingChargePerGram !== undefined)
      data.makingChargePerGram = new Prisma.Decimal(dto.makingChargePerGram);
    if (dto.fixedSalePrice !== undefined)
      data.fixedSalePrice = dto.fixedSalePrice
        ? new Prisma.Decimal(dto.fixedSalePrice)
        : null;
    if (dto.costPrice !== undefined)
      data.costPrice = dto.costPrice ? new Prisma.Decimal(dto.costPrice) : null;
    delete (data as any).stones; // الأحجار تُعدَّل عبر endpoint منفصل

    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true, branch: true, stones: true },
    });
  }

  /**
   * حذف ناعم (Soft Delete) — لا نحذف المنتجات فعلياً بسبب السجلات المالية.
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'WRITTEN_OFF' },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async ensureBranchExists(branchId: string) {
    const exists = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!exists) throw new NotFoundException(`الفرع غير موجود: ${branchId}`);
  }

  private async ensureCategoryExists(categoryId: string) {
    const exists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!exists)
      throw new NotFoundException(`التصنيف غير موجود: ${categoryId}`);
  }

  /**
   * توليد SKU بنمط: {METAL}{KARAT}-{YYMM}-{SEQUENCE}
   * مثال: GR22K-2605-00042
   */
  private async generateSku(metalType: string, karat: string): Promise<string> {
    const prefix = `${metalType.substring(0, 2)}${karat}`;
    const yymm =
      new Date().toISOString().substring(2, 4) +
      new Date().toISOString().substring(5, 7);
    const count = await this.prisma.product.count({
      where: { sku: { startsWith: `${prefix}-${yymm}-` } },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-${yymm}-${seq}`;
  }

  private generateBarcode(sku: string): string {
    // باركود بسيط مبني على SKU — لاحقاً يمكن استخدام EAN-13 معياري
    return sku.replace(/-/g, '');
  }
}
