import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  assertCanAccessTenant,
  resolveTenantFilter,
} from '../common/tenant-context.helper';

export class CreateBranchDto {
  @ApiProperty({ example: 'MAIN' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'الفرع الرئيسي' })
  @IsOptional() @IsString() nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateBranchDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBranchDto, user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);

    const existing = await this.prisma.branch.findFirst({
      where: { tenantId: targetTenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`الرمز مستخدم في هذا المحل: ${dto.code}`);
    }

    return this.prisma.branch.create({
      data: { ...dto, tenantId: targetTenantId },
    });
  }

  findAll(user: AuthUser, tenantId?: string) {
    const targetTenantId = resolveTenantFilter(user, tenantId);
    return this.prisma.branch.findMany({
      where: { tenantId: targetTenantId },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException(`الفرع غير موجود: ${id}`);
    assertCanAccessTenant(user, branch.tenantId);
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
