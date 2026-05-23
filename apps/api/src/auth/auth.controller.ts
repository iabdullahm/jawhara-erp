import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth — المصادقة')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'تسجيل دخول — يُعيد JWT' })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.auth.login(dto, ip);
  }

  @Post('register-tenant')
  @Roles(UserRole.PLATFORM_OWNER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'تسجيل محل جديد + صاحبه (PLATFORM_OWNER فقط)',
  })
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بيانات المستخدم الحالي' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }
}
