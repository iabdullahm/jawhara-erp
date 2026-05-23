import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Karat, MetalType, Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoldRateDto {
  @ApiPropertyOptional({ description: 'إذا null فالسعر عام لكل الفروع' })
  @IsOptional() @IsString() branchId?: string;

  @ApiProperty({ enum: MetalType, default: MetalType.GOLD })
  @IsEnum(MetalType) metalType: MetalType;

  @ApiProperty({ enum: Karat }) @IsEnum(Karat) karat: Karat;

  @ApiProperty({ example: 30.5 })
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  ratePerGram: number;

  @ApiPropertyOptional({ example: 'OMR' })
  @IsOptional() @IsString() currency?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class KaratRateEntry {
  @ApiProperty({ enum: Karat })
  @IsEnum(Karat) karat: Karat;

  @ApiProperty({ example: 34.5 })
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  ratePerGram: number;
}

export class BulkGoldRatesDto {
  @ApiPropertyOptional({ description: 'فرع محدد (null = عام)' })
  @IsOptional() @IsString() branchId?: string;

  @ApiPropertyOptional({ default: 'OMR' })
  @IsOptional() @IsString() currency?: string;

  @ApiProperty({
    type: [KaratRateEntry],
    description: 'قائمة العيارات وأسعارها (24/22/21/18/14)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KaratRateEntry)
  rates: KaratRateEntry[];

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;
}

import { AuthUser } from '../auth/decorators/current-user.decorator';
import { resolveTenantFilter } from '../common/tenant-context.helper';

@Injectable()
export class GoldRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGoldRateDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    return this.prisma.goldRate.create({
      data: {
        tenantId: targetTenantId,
        branchId: dto.branchId,
        metalType: dto.metalType,
        karat: dto.karat,
        ratePerGram: new Prisma.Decimal(dto.ratePerGram),
        currency: dto.currency ?? 'OMR',
        notes: dto.notes,
        source: 'manual',
        createdById: user.userId,
      },
    });
  }

  async createBulk(dto: BulkGoldRatesDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    if (!dto.rates?.length) {
      throw new BadRequestException('يجب إدخال سعر واحد على الأقل');
    }
    const created = await this.prisma.$transaction(
      dto.rates.map((r) =>
        this.prisma.goldRate.create({
          data: {
            tenantId: targetTenantId,
            branchId: dto.branchId,
            metalType: MetalType.GOLD,
            karat: r.karat,
            ratePerGram: new Prisma.Decimal(r.ratePerGram),
            currency: dto.currency ?? 'OMR',
            notes: dto.notes,
            source: 'manual-bulk',
            createdById: user.userId,
          },
        }),
      ),
    );
    return {
      success: true,
      count: created.length,
      rates: created.map((r) => ({
        karat: r.karat,
        ratePerGram: r.ratePerGram.toNumber(),
      })),
    };
  }

  /**
   * استرجاع آخر سعر فعّال لعيار/فرع/tenant معين
   */
  async getCurrentRate(params: {
    tenantId: string;
    metalType: MetalType;
    karat: Karat;
    branchId?: string;
  }) {
    if (params.branchId) {
      const branchRate = await this.prisma.goldRate.findFirst({
        where: {
          tenantId: params.tenantId,
          branchId: params.branchId,
          metalType: params.metalType,
          karat: params.karat,
        },
        orderBy: { effectiveDate: 'desc' },
      });
      if (branchRate) return branchRate;
    }
    return this.prisma.goldRate.findFirst({
      where: {
        tenantId: params.tenantId,
        branchId: null,
        metalType: params.metalType,
        karat: params.karat,
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async getTodayRates(user: AuthUser, branchId?: string, explicitTenantId?: string) {
    const tenantId = resolveTenantFilter(user, explicitTenantId);
    const karats = Object.values(Karat);
    const results = await Promise.all(
      karats.map(async (k) => {
        const rate = await this.getCurrentRate({
          tenantId,
          metalType: MetalType.GOLD,
          karat: k,
          branchId,
        });
        return { karat: k, rate };
      }),
    );
    return results.filter((r) => r.rate !== null);
  }

  history(karat: Karat, user: AuthUser, days = 30, explicitTenantId?: string) {
    const tenantId = resolveTenantFilter(user, explicitTenantId);
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.goldRate.findMany({
      where: { tenantId, karat, effectiveDate: { gte: since } },
      orderBy: { effectiveDate: 'asc' },
    });
  }
}
