import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Karat, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  BulkGoldRatesDto,
  CreateGoldRateDto,
  GoldRatesService,
} from './gold-rates.service';
import { GoldPriceApiService } from './gold-price-api.service';

@ApiTags('Gold Rates — أسعار الذهب')
@ApiBearerAuth()
@Controller('gold-rates')
export class GoldRatesController {
  constructor(
    private readonly goldRates: GoldRatesService,
    private readonly goldPriceApi: GoldPriceApiService,
  ) {}

  @Post()
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'إدخال سعر ذهب (عيار واحد)' })
  create(
    @Body() dto: CreateGoldRateDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.goldRates.create(dto, user, tenantId);
  }

  @Post('bulk')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: '⚡ إدخال أسعار كل العيارات دفعة واحدة' })
  createBulk(
    @Body() dto: BulkGoldRatesDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.goldRates.createBulk(dto, user, tenantId);
  }

  @Get('today')
  @ApiOperation({ summary: 'أسعار اليوم لجميع العيارات' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  today(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.goldRates.getTodayRates(user, branchId, tenantId);
  }

  @Get('history/:karat')
  @ApiOperation({ summary: 'تاريخ أسعار الذهب' })
  history(
    @Param('karat') karat: Karat,
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.goldRates.history(
      karat,
      user,
      days ? parseInt(days, 10) : 30,
      tenantId,
    );
  }
}
