import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  IsUUID,
  Min,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MetalType,
  Karat,
  WeightUnit,
  ProductStatus,
  OwnershipType,
  PricingMode,
} from '@prisma/client';

export class ProductStoneDto {
  @ApiProperty({ example: 'Diamond' })
  @IsString()
  stoneType: string;

  @ApiPropertyOptional({ example: 'ألماس' })
  @IsOptional()
  @IsString()
  stoneTypeAr?: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  count: number;

  @ApiProperty({ example: 0.75, description: 'Total weight in carats' })
  @IsNumber()
  @Min(0)
  caratWeight: number;

  @ApiPropertyOptional({ example: 'VS1' })
  @IsOptional()
  @IsString()
  clarity?: string;

  @ApiPropertyOptional({ example: 'D' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'Excellent' })
  @IsOptional()
  @IsString()
  cut?: string;

  @ApiPropertyOptional({ example: 'Round' })
  @IsOptional()
  @IsString()
  shape?: string;

  @ApiPropertyOptional({ example: 'GIA-2185749632' })
  @IsOptional()
  @IsString()
  certificateNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerCarat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;
}

export class CreateProductDto {
  @ApiPropertyOptional({
    description: 'SKU - يُولَّد تلقائياً إذا لم يُحدَّد',
    example: 'GR-22K-0001',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'الباركود - يُولَّد تلقائياً إذا لم يُحدَّد',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rfidTag?: string;

  @ApiProperty({ example: 'Gold Ring 22K' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'خاتم ذهب عيار 22' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ description: 'Category ID' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ description: 'Branch ID where this item is stocked' })
  @IsString()
  branchId: string;

  @ApiProperty({ enum: MetalType, default: MetalType.GOLD })
  @IsEnum(MetalType)
  metalType: MetalType;

  @ApiProperty({ enum: Karat, default: Karat.K22 })
  @IsEnum(Karat)
  karat: Karat;

  @ApiProperty({ example: 12.5, description: 'الوزن الإجمالي بالجرام' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  grossWeight: number;

  @ApiProperty({ example: 11.8, description: 'وزن المعدن الصافي بالجرام' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  netWeight: number;

  @ApiPropertyOptional({ example: 0.7, description: 'وزن الأحجار بالجرام' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  stoneWeight?: number;

  @ApiPropertyOptional({ enum: WeightUnit, default: WeightUnit.GRAM })
  @IsOptional()
  @IsEnum(WeightUnit)
  sellingUnit?: WeightUnit;

  @ApiPropertyOptional({
    enum: PricingMode,
    default: PricingMode.DYNAMIC,
    description: 'آلية التسعير: DYNAMIC (يتبع سعر الذهب) / FIXED (سعر ثابت) / HYBRID (مزيج)',
  })
  @IsOptional()
  @IsEnum(PricingMode)
  pricingMode?: PricingMode;

  @ApiPropertyOptional({
    description: 'هامش أمان % يُضاف للسعر الديناميكي (مثلاً 2 = +2%)',
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  safetyMarginPct?: number;

  @ApiPropertyOptional({ description: 'أجرة الصياغة مقطوعة' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  makingCharge?: number;

  @ApiPropertyOptional({ description: 'أجرة الصياغة لكل جرام' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  makingChargePerGram?: number;

  @ApiPropertyOptional({
    description: 'سعر بيع ثابت (للقطع التي لا تعتمد على سعر الذهب اليومي)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  fixedSalePrice?: number;

  @ApiPropertyOptional({ description: 'سعر التكلفة (الشراء)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hallmark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  hallmarkedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hallmarkAuthority?: string;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.IN_STOCK })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: OwnershipType, default: OwnershipType.OWNED })
  @IsOptional()
  @IsEnum(OwnershipType)
  ownershipType?: OwnershipType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryImageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designCode?: string;

  @ApiPropertyOptional({ example: '18', description: 'مقاس الخاتم/السوار' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesAr?: string;

  @ApiPropertyOptional({
    type: [ProductStoneDto],
    description: 'قائمة الأحجار في القطعة (اختياري)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductStoneDto)
  stones?: ProductStoneDto[];
}
