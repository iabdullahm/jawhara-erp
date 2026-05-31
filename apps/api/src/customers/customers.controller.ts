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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateCustomerDto,
  CustomersService,
  QueryCustomersDto,
  UpdateCustomerDto,
} from './customers.service';

@ApiTags('Customers — العملاء')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @Roles(
    UserRole.PLATFORM_OWNER,
    UserRole.TENANT_OWNER,
    UserRole.MANAGER,
    UserRole.SALESPERSON,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'إنشاء عميل جديد' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.customers.create(dto, user, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة العملاء' })
  findAll(
    @Query() query: QueryCustomersDto,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.customers.findAll(query, user, tenantId);
  }

  @Get('search')
  @ApiOperation({ summary: 'بحث سريع (للـ POS) — برقم الهاتف أو الاسم' })
  quickSearch(
    @Query('q') q: string,
    @CurrentUser() user: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.customers.quickSearch(q, user, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.customers.findOne(id, user);
  }

  @Patch(':id')
  @Roles(
    UserRole.PLATFORM_OWNER,
    UserRole.TENANT_OWNER,
    UserRole.MANAGER,
    UserRole.SALESPERSON,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customers.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_OWNER, UserRole.TENANT_OWNER, UserRole.MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.customers.remove(id, user);
  }
}
