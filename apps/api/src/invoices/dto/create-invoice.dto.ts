import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Karat, PaymentMethod } from '@prisma/client';

export class InvoiceItemInputDto {
  @ApiProperty() @IsString() productId: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @IsNumber() @Min(1) quantity?: number;

  @ApiPropertyOptional({ description: 'خصم على هذا البند (مبلغ ثابت)' })
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() discountReason?: string;

  @ApiPropertyOptional({ description: 'سعر يدوي يتجاوز الحساب التلقائي' })
  @IsOptional() @IsNumber() @Min(0) overridePrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PaymentInputDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod) method: PaymentMethod;

  @ApiProperty() @IsNumber() @Min(0) amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class OldGoldInputDto {
  @ApiProperty({ description: 'الوزن بالجرام' })
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) weight: number;

  @ApiProperty({ enum: Karat }) @IsEnum(Karat) karat: Karat;

  @ApiProperty({ description: 'سعر استلام الجرام (قد يختلف عن سعر السوق)' })
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) ratePerGram: number;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class CreateInvoiceDto {
  @ApiProperty() @IsString() branchId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;

  @ApiPropertyOptional({ default: 5, description: 'نسبة VAT' })
  @IsOptional() @IsNumber() @Min(0) vatRate?: number;

  @ApiPropertyOptional({ description: 'خصم على المجموع (مبلغ ثابت)' })
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() discountReason?: string;

  @ApiProperty({ type: [InvoiceItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items: InvoiceItemInputDto[];

  @ApiPropertyOptional({ type: [PaymentInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentInputDto)
  payments?: PaymentInputDto[];

  @ApiPropertyOptional({ type: [OldGoldInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OldGoldInputDto)
  oldGoldItems?: OldGoldInputDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
