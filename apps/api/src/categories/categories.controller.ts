import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CategoriesService,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './categories.service';

@ApiTags('Categories — التصنيفات')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.categories.create(dto, user, tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('tenantId') tenantId?: string) {
    return this.categories.findAll(user, tenantId);
  }

  @Get('tree')
  findTree(@CurrentUser() user: AuthUser, @Query('tenantId') tenantId?: string) {
    return this.categories.findTree(user, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.categories.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categories.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.categories.remove(id, user);
  }
}
