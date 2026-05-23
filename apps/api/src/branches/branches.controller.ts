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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  BranchesService,
  CreateBranchDto,
  UpdateBranchDto,
} from './branches.service';

@ApiTags('Branches — الفروع')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  @ApiQuery({ name: 'tenantId', required: false })
  create(
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.branches.create(dto, user, tenantId);
  }

  @Get()
  @ApiQuery({ name: 'tenantId', required: false })
  findAll(@CurrentUser() user: AuthUser, @Query('tenantId') tenantId?: string) {
    return this.branches.findAll(user, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.branches.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.branches.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.branches.remove(id, user);
  }
}
