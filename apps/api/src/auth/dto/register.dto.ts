import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * يستخدمها PLATFORM_OWNER فقط لتسجيل tenant جديد + tenant owner له
 * (يمكن لاحقاً السماح بالتسجيل العام للمستخدم العادي)
 */
export class RegisterTenantDto {
  // بيانات المحل
  @ApiProperty({ example: 'مجوهرات النجم' })
  @IsString()
  tenantName: string;

  @ApiPropertyOptional({ example: 'Najm Jewelry' })
  @IsOptional()
  @IsString()
  tenantNameEn?: string;

  @ApiProperty({ example: 'najm-jewelry', description: 'slug فريد بالإنجليزي' })
  @IsString()
  tenantSlug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantAddress?: string;

  // بيانات صاحب المحل (TENANT_OWNER)
  @ApiProperty({ example: 'محمد العمري' })
  @IsString()
  ownerName: string;

  @ApiProperty({ example: 'owner@najm.com' })
  @IsEmail()
  ownerEmail: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  ownerPassword: string;
}
