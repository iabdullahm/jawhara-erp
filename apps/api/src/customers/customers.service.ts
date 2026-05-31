import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  assertCanAccessTenant,
  resolveTenantFilter,
} from '../common/tenant-context.helper';

export class CreateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternativePhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVip?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() anniversaryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternativePhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVip?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() loyaltyPoints?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() anniversaryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryCustomersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) isVip?: boolean;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 50;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);

    if (dto.code) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId: targetTenantId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`الرمز مستخدم بالفعل: ${dto.code}`);
      }
    }

    return this.prisma.customer.create({
      data: {
        tenantId: targetTenantId,
        code: dto.code,
        name: dto.name,
        nameAr: dto.nameAr,
        phone: dto.phone,
        alternativePhone: dto.alternativePhone,
        email: dto.email,
        address: dto.address,
        idType: dto.idType,
        idNumber: dto.idNumber,
        idImageUrl: dto.idImageUrl,
        creditLimit: dto.creditLimit !== undefined
          ? new Prisma.Decimal(dto.creditLimit)
          : undefined,
        isVip: dto.isVip ?? false,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        anniversaryDate: dto.anniversaryDate ? new Date(dto.anniversaryDate) : null,
        notes: dto.notes,
      },
    });
  }

  async findAll(query: QueryCustomersDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    const { search, isVip, page = 1, pageSize = 50 } = query;

    const where: Prisma.CustomerWhereInput = {
      tenantId: targetTenantId,
      deletedAt: null,
      ...(isVip !== undefined && { isVip }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameAr: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { idNumber: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ isVip: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * بحث سريع للـ POS (مثلاً عند كتابة رقم الهاتف)
   */
  async quickSearch(q: string, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    if (!q || q.length < 2) return [];
    return this.prisma.customer.findMany({
      where: {
        tenantId: targetTenantId,
        deletedAt: null,
        OR: [
          { phone: { contains: q } },
          { name: { contains: q, mode: 'insensitive' } },
          { nameAr: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        nameAr: true,
        phone: true,
        isVip: true,
        loyaltyPoints: true,
        outstandingBalance: true,
      },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 20,
          select: {
            id: true,
            invoiceNo: true,
            total: true,
            status: true,
            invoiceDate: true,
          },
        },
      },
    });
    if (!customer || customer.deletedAt) {
      throw new NotFoundException('العميل غير موجود');
    }
    assertCanAccessTenant(user, customer.tenantId);
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthUser) {
    await this.findOne(id, user);
    const data: Prisma.CustomerUpdateInput = { ...dto } as any;
    if (dto.creditLimit !== undefined) {
      data.creditLimit = new Prisma.Decimal(dto.creditLimit);
    }
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    if (dto.anniversaryDate) data.anniversaryDate = new Date(dto.anniversaryDate);
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
