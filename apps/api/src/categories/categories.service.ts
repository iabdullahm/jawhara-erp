import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  assertCanAccessTenant,
  resolveTenantFilter,
} from '../common/tenant-context.helper';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Rings' }) @IsString() name: string;
  @ApiPropertyOptional({ example: 'خواتم' }) @IsOptional() @IsString() nameAr?: string;
  @ApiProperty({ example: 'rings' }) @IsString() slug: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    const existing = await this.prisma.category.findFirst({
      where: { tenantId: targetTenantId, slug: dto.slug },
    });
    if (existing) throw new ConflictException(`slug مستخدم: ${dto.slug}`);
    return this.prisma.category.create({
      data: { ...dto, tenantId: targetTenantId },
    });
  }

  findAll(user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    return this.prisma.category.findMany({
      where: { tenantId: targetTenantId },
      include: { children: true, _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findTree(user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    const all = await this.prisma.category.findMany({
      where: { tenantId: targetTenantId },
      orderBy: { sortOrder: 'asc' },
    });
    const map = new Map(all.map((c) => [c.id, { ...c, children: [] as any[] }]));
    const roots: any[] = [];
    for (const cat of map.values()) {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    }
    return roots;
  }

  async findOne(id: string, user: AuthUser) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!category) throw new NotFoundException(`التصنيف غير موجود: ${id}`);
    assertCanAccessTenant(user, category.tenantId);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
