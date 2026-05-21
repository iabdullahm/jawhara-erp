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
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@ApiTags('Products — المنتجات')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء منتج جديد (قطعة مجوهرات)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة المنتجات مع فلترة وبحث وتصفح' })
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('barcode/:code')
  @ApiOperation({ summary: 'بحث عن منتج بالباركود/SKU/RFID (لشاشة POS)' })
  @ApiParam({ name: 'code' })
  findByBarcode(@Param('code') code: string) {
    return this.productsService.findByBarcode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'استرجاع تفاصيل منتج كامل' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/price')
  @ApiOperation({
    summary:
      'حساب السعر الحالي للمنتج (وزن × سعر الذهب اليومي + الأحجار + الأجرة)',
  })
  calculatePrice(@Param('id') id: string) {
    return this.productsService.calculateCurrentPrice(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تعديل منتج' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف ناعم للمنتج (Soft Delete)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
