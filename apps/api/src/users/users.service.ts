import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole) role: UserRole;

  @ApiPropertyOptional({ description: 'فرع افتراضي للمستخدم' })
  @IsOptional() @IsString() defaultBranchId?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultBranchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) newPassword: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeSelect = {
    id: true,
    email: true,
    name: true,
    nameAr: true,
    phone: true,
    role: true,
    avatarUrl: true,
    tenantId: true,
    defaultBranchId: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  };

  /**
   * قائمة مستخدمي محل معين
   */
  async list(user: AuthUser, tenantId?: string) {
    const targetTenantId = this.resolveTenantId(user, tenantId);

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (targetTenantId) {
      where.tenantId = targetTenantId;
    } else if (user.role === UserRole.PLATFORM_OWNER) {
      // PLATFORM_OWNER يرى الكل
    }

    return this.prisma.user.findMany({
      where,
      select: this.safeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeSelect,
    });
    if (!target) throw new NotFoundException('المستخدم غير موجود');
    this.ensureCanAccessUser(user, target);
    return target;
  }

  /**
   * إنشاء مستخدم جديد داخل محل المُنشئ
   * (TENANT_OWNER يضيف موظفيه، PLATFORM_OWNER يضيف لأي محل)
   */
  async create(dto: CreateUserDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = this.resolveTenantId(user, tenantId);

    // PLATFORM_OWNER فقط يمكنه إنشاء PLATFORM_OWNER آخر
    if (dto.role === UserRole.PLATFORM_OWNER && user.role !== UserRole.PLATFORM_OWNER) {
      throw new ForbiddenException('غير مصرح بإنشاء PLATFORM_OWNER');
    }

    // TENANT_OWNER لا يمكنه إنشاء TENANT_OWNER آخر (يحدث ذلك عبر register-tenant)
    if (dto.role === UserRole.TENANT_OWNER && user.role === UserRole.TENANT_OWNER) {
      throw new ForbiddenException('استخدم endpoint تسجيل محل جديد لإنشاء TENANT_OWNER');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        nameAr: dto.nameAr,
        phone: dto.phone,
        role: dto.role,
        tenantId: dto.role === UserRole.PLATFORM_OWNER ? null : targetTenantId,
        defaultBranchId: dto.defaultBranchId,
      },
      select: this.safeSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto, user: AuthUser) {
    const target = await this.findOne(id, user);

    // لا يمكن لـ TENANT_OWNER تغيير role إلى PLATFORM_OWNER
    if (dto.role === UserRole.PLATFORM_OWNER && user.role !== UserRole.PLATFORM_OWNER) {
      throw new ForbiddenException('غير مصرح');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.safeSelect,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, user: AuthUser) {
    const target = await this.findOne(id, user);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return { success: true };
  }

  /**
   * حذف ناعم
   */
  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    if (id === user.userId) {
      throw new ForbiddenException('لا يمكنك حذف حسابك الخاص');
    }
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: this.safeSelect,
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private resolveTenantId(user: AuthUser, requestedTenantId?: string): string | null {
    if (user.role === UserRole.PLATFORM_OWNER) {
      // PLATFORM_OWNER يحدد tenantId يدوياً أو يرى الكل
      return requestedTenantId ?? null;
    }
    // باقي الأدوار يجب أن يكون لهم tenantId
    if (!user.tenantId) {
      throw new ForbiddenException('لا تنتمي لأي محل');
    }
    return user.tenantId;
  }

  private ensureCanAccessUser(
    user: AuthUser,
    target: { tenantId: string | null },
  ) {
    if (user.role === UserRole.PLATFORM_OWNER) return;
    if (user.tenantId && user.tenantId === target.tenantId) return;
    throw new ForbiddenException('غير مصرح بالوصول لهذا المستخدم');
  }
}
