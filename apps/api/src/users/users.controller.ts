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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
  UsersService,
} from './users.service';

@ApiTags('Users — المستخدمين')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(
    UserRole.PLATFORM_OWNER,
    UserRole.TENANT_OWNER,
    UserRole.MANAGER,
  )
  @ApiOperation({ summary: 'قائمة مستخدمي المحل' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'لـ PLATFORM_OWNER فقط' })
  list(@CurrentUser() user: AuthUser, @Query('tenantId') tenantId?: string) {
    return this.users.list(user, tenantId);
  }

  @Post()
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'إنشاء مستخدم جديد' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.users.create(dto, user, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'بيانات مستخدم' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.users.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'تعديل مستخدم' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.users.update(id, dto, user);
  }

  @Patch(':id/password')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER)
  @ApiOperation({ summary: 'تغيير كلمة السر' })
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.users.changePassword(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER)
  @ApiOperation({ summary: 'حذف مستخدم' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.users.remove(id, user);
  }
}
