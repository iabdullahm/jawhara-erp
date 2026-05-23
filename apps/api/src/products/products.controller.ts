import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products — المنتجات')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(
    UserRole.PLATFORM_OWNER,
    UserRole.TENANT_OWNER,
    UserRole.MANAGER,
    UserRole.SALESPERSON,
  )
  @ApiOperation({ summary: 'إنشاء منتج جديد (قطعة مجوهرات)' })
  @ApiQuery({ name: 'tenantId', required: false })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productsService.create(dto, user, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة المنتجات مع فلترة وبحث وتصفح' })
  @ApiQuery({ name: 'tenantId', required: false })
  findAll(
    @Query() query: QueryProductsDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productsService.findAll(query, user, tenantId);
  }

  @Get('barcode/:code')
  @ApiOperation({ summary: 'بحث عن منتج بالباركود/SKU/RFID (لشاشة POS)' })
  @ApiParam({ name: 'code' })
  findByBarcode(
    @Param('code') code: string,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productsService.findByBarcode(code, user, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'استرجاع تفاصيل منتج كامل' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findOne(id, user);
  }

  @Get(':id/price')
  @ApiOperation({ summary: 'حساب السعر الحالي للمنتج' })
  calculatePrice(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.calculateCurrentPrice(id, user);
  }

  @Patch(':id')
  @Roles(
    UserRole.PLATFORM_OWNER,
    UserRole.TENANT_OWNER,
    UserRole.MANAGER,
  )
  @ApiOperation({ summary: 'تعديل منتج' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف ناعم للمنتج' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user);
  }
}
