import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, SubscriptionPlan, SubscriptionStatus, UserRole } from '@prisma/client';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

export class UpdateTenantDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locale?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional() @IsEnum(SubscriptionPlan) plan?: SubscriptionPlan;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional() @IsEnum(SubscriptionStatus) status?: SubscriptionStatus;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxBranches?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxUsers?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxProducts?: number;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * قائمة المحلات (PLATFORM_OWNER فقط)
   */
  async listAll() {
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            users: true,
            branches: true,
            products: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tenants;
  }

  /**
   * بيانات المحل الحالي (للمستخدم العادي)
   */
  async getMyTenant(user: AuthUser) {
    if (!user.tenantId) {
      throw new ForbiddenException('لست منتمياً لمحل');
    }
    return this.findOne(user.tenantId);
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            branches: true,
            products: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('المحل غير موجود');
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto, user: AuthUser) {
    this.ensureCanAccessTenant(user, id);
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * تحديث الاشتراك (PLATFORM_OWNER فقط)
   */
  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * إيقاف محل مؤقتاً (PLATFORM_OWNER فقط)
   */
  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { status: SubscriptionStatus.SUSPENDED, isActive: false },
    });
  }

  /**
   * إعادة تفعيل محل
   */
  async reactivate(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { status: SubscriptionStatus.ACTIVE, isActive: true },
    });
  }

  /**
   * حذف ناعم
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private ensureCanAccessTenant(user: AuthUser, tenantId: string) {
    if (user.role === UserRole.PLATFORM_OWNER) return;
    if (user.tenantId === tenantId) return;
    throw new ForbiddenException('غير مصرح بالوصول لهذا المحل');
  }
}
