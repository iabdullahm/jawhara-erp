import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  TenantsService,
  UpdateSubscriptionDto,
  UpdateTenantDto,
} from './tenants.service';

@ApiTags('Tenants — المحلات')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @Roles(UserRole.PLATFORM_OWNER)
  @ApiOperation({ summary: 'قائمة كل المحلات (PLATFORM_OWNER فقط)' })
  listAll() {
    return this.tenants.listAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'بيانات محل المستخدم الحالي' })
  getMyTenant(@CurrentUser() user: AuthUser) {
    return this.tenants.getMyTenant(user);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER)
  @ApiOperation({ summary: 'بيانات محل بالـ ID' })
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER)
  @ApiOperation({ summary: 'تحديث بيانات المحل' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenants.update(id, dto, user);
  }

  @Patch(':id/subscription')
  @Roles(UserRole.PLATFORM_OWNER)
  @ApiOperation({ summary: 'تحديث الاشتراك (PLATFORM_OWNER فقط)' })
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.tenants.updateSubscription(id, dto);
  }

  @Post(':id/suspend')
  @Roles(UserRole.PLATFORM_OWNER)
  @ApiOperation({ summary: 'إيقاف محل مؤقتاً' })
  suspend(@Param('id') id: string) {
    return this.tenants.suspend(id);
  }

  @Post(':id/reactivate')
  @Roles(UserRole.PLATFORM_OWNER)
  @ApiOperation({ summary: 'إعادة تفعيل محل' })
  reactivate(@Param('id') id: string) {
    return this.tenants.reactivate(id);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_OWNER)
  @ApiOperation({ summary: 'حذف ناعم' })
  remove(@Param('id') id: string) {
    return this.tenants.remove(id);
  }
}
