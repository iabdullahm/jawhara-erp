import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';

export class BootstrapDto {
  @ApiProperty({ example: 'abdullah-aljahwari@outlook.com' })
  @IsEmail() email: string;

  @ApiProperty({ minLength: 8, example: 'Owner@2026' })
  @IsString() @MinLength(8) password: string;

  @ApiProperty({ example: 'Abdullah Al-Jahwari' })
  @IsString() name: string;
}

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

  @Public()
  @Post('bootstrap')
  @ApiOperation({
    summary: '🚀 تهيئة النظام لأول مرة (إنشاء PLATFORM_OWNER + Tenant تجريبي)',
    description: 'يعمل مرة واحدة فقط — إذا قاعدة البيانات فارغة من المستخدمين',
  })
  bootstrap(@Body() dto: BootstrapDto) {
    return this.auth.bootstrap(dto);
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
