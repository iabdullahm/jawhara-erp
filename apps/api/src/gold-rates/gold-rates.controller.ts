import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Karat } from '@prisma/client';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BulkGoldRatesDto,
  CreateGoldRateDto,
  GoldRatesService,
} from './gold-rates.service';
import { GoldPriceApiService } from './gold-price-api.service';

export class SyncRatesDto {
  @ApiPropertyOptional({ default: 'USD', description: 'عملة المصدر من API' })
  @IsOptional() @IsString() baseCurrency?: string;

  @ApiPropertyOptional({ default: 'OMR', description: 'العملة المحلية للحفظ' })
  @IsOptional() @IsString() targetCurrency?: string;

  @ApiPropertyOptional({ description: 'سعر صرف يدوي (افتراضياً يُستخدم سعر مدمج)' })
  @IsOptional() @IsNumber() @Min(0) fxRate?: number;

  @ApiPropertyOptional({ description: 'فرع محدد، أو null لسعر عام' })
  @IsOptional() @IsString() branchId?: string;
}

@ApiTags('Gold Rates — أسعار الذهب اليومية')
@Controller('gold-rates')
export class GoldRatesController {
  constructor(
    private readonly goldRates: GoldRatesService,
    private readonly goldPriceApi: GoldPriceApiService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إدخال سعر ذهب جديد يدوياً (عيار واحد)' })
  create(@Body() dto: CreateGoldRateDto) {
    return this.goldRates.create(dto);
  }

  @Post('bulk')
  @ApiOperation({
    summary: '⚡ إدخال أسعار كل العيارات دفعة واحدة (التحديث اليومي السريع)',
  })
  createBulk(@Body() dto: BulkGoldRatesDto) {
    return this.goldRates.createBulk(dto);
  }

  @Post('sync')
  @ApiOperation({
    summary: '🔄 جلب أسعار الذهب الحقيقية من goldapi.io وحفظها',
    description: 'يجلب أسعار 5 عيارات (24/22/21/18/14) ويحوّلها للعملة المحلية',
  })
  syncFromApi(@Body() dto: SyncRatesDto) {
    return this.goldPriceApi.syncRates(dto);
  }

  @Get('today')
  @ApiOperation({ summary: 'أسعار اليوم لجميع العيارات' })
  @ApiQuery({ name: 'branchId', required: false })
  today(@Query('branchId') branchId?: string) {
    return this.goldRates.getTodayRates(branchId);
  }

  @Get('history/:karat')
  @ApiOperation({ summary: 'تاريخ أسعار الذهب لعيار محدد (آخر N يوم)' })
  history(@Param('karat') karat: Karat, @Query('days') days?: string) {
    return this.goldRates.history(karat, days ? parseInt(days, 10) : 30);
  }
}
