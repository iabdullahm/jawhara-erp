import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Karat } from '@prisma/client';
import { CreateGoldRateDto, GoldRatesService } from './gold-rates.service';

@ApiTags('Gold Rates — أسعار الذهب اليومية')
@Controller('gold-rates')
export class GoldRatesController {
  constructor(private readonly goldRates: GoldRatesService) {}

  @Post()
  @ApiOperation({ summary: 'إدخال سعر ذهب جديد (يُستخدم من الآن في الحسابات)' })
  create(@Body() dto: CreateGoldRateDto) {
    return this.goldRates.create(dto);
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
