import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRole, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * تسجيل دخول
   * يتحقق من email + password ويُرجع JWT
   */
  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            slug: true,
            isActive: true,
            status: true,
            plan: true,
            currency: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    // تحقق أن الـ tenant نشط (إذا المستخدم ليس PLATFORM_OWNER)
    if (user.role !== UserRole.PLATFORM_OWNER) {
      if (!user.tenant || !user.tenant.isActive) {
        throw new ForbiddenException('المحل غير نشط. تواصل مع الإدارة.');
      }
      if (user.tenant.status === 'SUSPENDED') {
        throw new ForbiddenException('اشتراك المحل موقوف. يرجى التواصل مع الإدارة.');
      }
      if (user.tenant.status === 'EXPIRED') {
        throw new ForbiddenException('انتهت صلاحية الاشتراك. يرجى تجديده.');
      }
    }

    // تحديث آخر دخول
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const token = await this.signToken(user.id, user.email, user.role, user.tenantId, user.name);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nameAr: user.nameAr,
        role: user.role,
        avatarUrl: user.avatarUrl,
        tenant: user.tenant,
      },
    };
  }

  /**
   * Bootstrap: إنشاء أول PLATFORM_OWNER + Tenant افتراضي
   * متاح فقط إذا قاعدة البيانات فارغة (لا توجد مستخدمين)
   */
  async bootstrap(dto: { email: string; password: string; name: string }) {
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      throw new ConflictException(
        'النظام مُهيأ بالفعل. استخدم /auth/login للدخول.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // إنشاء PLATFORM_OWNER
    const platformOwner = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        nameAr: dto.name,
        role: UserRole.PLATFORM_OWNER,
      },
    });

    // إنشاء Tenant تجريبي + TENANT_OWNER
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const demoTenantOwnerHash = await bcrypt.hash('Owner@2026', 12);
    const tenant = await this.prisma.tenant.create({
      data: {
        slug: 'jawhara-demo',
        name: 'Jawhara Demo Jewelry',
        nameAr: 'مجوهرات جوهرة (تجريبي)',
        plan: SubscriptionPlan.PRO,
        trialEndsAt,
        maxBranches: 5,
        maxUsers: 20,
        maxProducts: 10000,
        users: {
          create: [
            {
              email: 'owner@jawhara-demo.com',
              passwordHash: demoTenantOwnerHash,
              name: 'Demo Owner',
              nameAr: 'صاحب المحل التجريبي',
              role: UserRole.TENANT_OWNER,
            },
            {
              email: 'manager@jawhara-demo.com',
              passwordHash: await bcrypt.hash('Manager@2026', 12),
              name: 'Demo Manager',
              nameAr: 'مدير الفرع',
              role: UserRole.MANAGER,
            },
            {
              email: 'sales@jawhara-demo.com',
              passwordHash: await bcrypt.hash('Sales@2026', 12),
              name: 'Demo Salesperson',
              nameAr: 'البائع التجريبي',
              role: UserRole.SALESPERSON,
            },
          ],
        },
        branches: {
          create: [
            {
              code: 'MAIN',
              name: 'Main Showroom',
              nameAr: 'الفرع الرئيسي',
              address: 'الموج، مسقط',
            },
          ],
        },
        categories: {
          create: [
            { name: 'Jewelry', nameAr: 'مجوهرات', slug: 'jewelry', sortOrder: 1 },
            { name: 'Rings', nameAr: 'خواتم', slug: 'rings', sortOrder: 2 },
            { name: 'Necklaces', nameAr: 'قلائد', slug: 'necklaces', sortOrder: 3 },
            { name: 'Bracelets', nameAr: 'أساور', slug: 'bracelets', sortOrder: 4 },
            { name: 'Earrings', nameAr: 'أقراط', slug: 'earrings', sortOrder: 5 },
          ],
        },
      },
      include: { users: true, branches: true, categories: true },
    });

    this.logger.log(`✅ Bootstrap complete: PLATFORM_OWNER=${dto.email}, Tenant=${tenant.slug}`);

    return {
      success: true,
      message: 'تم تهيئة النظام بنجاح',
      platformOwner: {
        email: platformOwner.email,
        name: platformOwner.name,
      },
      demoTenant: {
        slug: tenant.slug,
        name: tenant.nameAr,
        users: tenant.users.map((u) => ({ email: u.email, role: u.role })),
      },
      hint: 'استخدم /auth/login للدخول الآن',
    };
  }

  /**
   * تسجيل محل جديد (Tenant) + مالكه (TENANT_OWNER)
   * يستخدمه PLATFORM_OWNER فقط
   */
  async registerTenant(dto: RegisterTenantDto) {
    // التحقق من عدم تكرار الـ slug أو الإيميل
    const [existingSlug, existingEmail] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } }),
      this.prisma.user.findUnique({ where: { email: dto.ownerEmail.toLowerCase() } }),
    ]);

    if (existingSlug) {
      throw new ConflictException('slug المحل مستخدم بالفعل');
    }
    if (existingEmail) {
      throw new ConflictException('البريد الإلكتروني مسجل بالفعل');
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    // فترة تجريبية 30 يوم
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const tenant = await this.prisma.tenant.create({
      data: {
        slug: dto.tenantSlug.toLowerCase(),
        name: dto.tenantNameEn ?? dto.tenantName,
        nameAr: dto.tenantName,
        phone: dto.tenantPhone,
        address: dto.tenantAddress,
        plan: SubscriptionPlan.TRIAL,
        trialEndsAt,
        users: {
          create: {
            email: dto.ownerEmail.toLowerCase(),
            passwordHash,
            name: dto.ownerName,
            nameAr: dto.ownerName,
            role: UserRole.TENANT_OWNER,
          },
        },
      },
      include: { users: true },
    });

    this.logger.log(`✅ Registered new tenant: ${tenant.slug} (owner: ${dto.ownerEmail})`);

    return {
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        nameAr: tenant.nameAr,
        plan: tenant.plan,
        trialEndsAt: tenant.trialEndsAt,
      },
      owner: {
        id: tenant.users[0].id,
        email: tenant.users[0].email,
        name: tenant.users[0].name,
        role: tenant.users[0].role,
      },
    };
  }

  /**
   * الحصول على بيانات المستخدم الحالي مع tenant
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            nameAr: true,
            currency: true,
            locale: true,
            plan: true,
            status: true,
            logoUrl: true,
            isActive: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      nameAr: user.nameAr,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      defaultBranchId: user.defaultBranchId,
      lastLoginAt: user.lastLoginAt,
      tenant: user.tenant,
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async signToken(
    userId: string,
    email: string,
    role: UserRole,
    tenantId: string | null,
    name: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      tenantId,
      name,
    };
    return this.jwt.signAsync(payload);
  }
}
