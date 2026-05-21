import { Injectable, NotFoundException } from '@nestjs/common';
import { Karat, MetalType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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

@Injectable()
export class GoldRatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * إدخال سعر ذهب جديد ليوم/وقت معين.
   * نحفظ السعر مع طابع زمني — السعر الفعلي هو آخر سعر مُدخَل.
   */
  async create(dto: CreateGoldRateDto) {
    return this.prisma.goldRate.create({
      data: {
        branchId: dto.branchId,
        metalType: dto.metalType,
        karat: dto.karat,
        ratePerGram: new Prisma.Decimal(dto.ratePerGram),
        currency: dto.currency ?? 'OMR',
        notes: dto.notes,
        source: 'manual',
      },
    });
  }

  /**
   * استرجاع آخر سعر فعّال لعيار معين في فرع معين.
   * ترتيب الأولوية: سعر الفرع المحدد > السعر العام.
   */
  async getCurrentRate(params: {
    metalType: MetalType;
    karat: Karat;
    branchId?: string;
  }) {
    // أولاً: ابحث عن سعر للفرع المحدد
    if (params.branchId) {
      const branchRate = await this.prisma.goldRate.findFirst({
        where: {
          branchId: params.branchId,
          metalType: params.metalType,
          karat: params.karat,
        },
        orderBy: { effectiveDate: 'desc' },
      });
      if (branchRate) return branchRate;
    }
    // ثانياً: سعر عام (branchId = null)
    return this.prisma.goldRate.findFirst({
      where: {
        branchId: null,
        metalType: params.metalType,
        karat: params.karat,
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  /**
   * استرجاع أحدث الأسعار لكل العيارات (لعرضها في لوحة التحكم).
   */
  async getTodayRates(branchId?: string) {
    const karats = Object.values(Karat);
    const results = await Promise.all(
      karats.map(async (k) => {
        const rate = await this.getCurrentRate({
          metalType: MetalType.GOLD,
          karat: k,
          branchId,
        });
        return { karat: k, rate };
      }),
    );
    return results.filter((r) => r.rate !== null);
  }

  /**
   * تاريخ أسعار الذهب (للرسم البياني).
   */
  history(karat: Karat, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.goldRate.findMany({
      where: { karat, effectiveDate: { gte: since } },
      orderBy: { effectiveDate: 'asc' },
    });
  }
}
