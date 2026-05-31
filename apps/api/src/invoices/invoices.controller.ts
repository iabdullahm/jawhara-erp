import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus, UserRole } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

export class CancelInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

@ApiTags('Invoices — الفواتير (POS)')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  @Roles(
    UserRole.PLATFORM_OWNER,
    UserRole.TENANT_OWNER,
    UserRole.MANAGER,
    UserRole.SALESPERSON,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'إنشاء فاتورة POS (بنود + دفعات + استبدال ذهب)' })
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.invoices.create(dto, user, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة الفواتير' })
  findAll(
    @Query() query: {
      branchId?: string;
      customerId?: string;
      status?: InvoiceStatus;
      page?: number;
      pageSize?: number;
    },
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.invoices.findAll(query, user, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل فاتورة' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.invoices.findOne(id, user);
  }

  @Post(':id/cancel')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'إلغاء فاتورة (يُعيد المنتجات للمخزون)' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.cancel(id, dto.reason ?? 'بدون سبب', user);
  }
}
