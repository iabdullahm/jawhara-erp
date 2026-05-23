import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/decorators/current-user.decorator';

/**
 * استخراج tenantId الذي يجب أن تُفلتر به العمليات.
 * - المستخدم العادي: tenantId الخاص به
 * - PLATFORM_OWNER: لازم يمرر tenantId يدوياً (لو فاضي يرى الكل)
 */
export function resolveTenantFilter(
  user: AuthUser,
  explicitTenantId?: string,
): string {
  if (user.role === UserRole.PLATFORM_OWNER) {
    if (!explicitTenantId) {
      throw new ForbiddenException(
        'PLATFORM_OWNER يجب أن يحدد tenantId في الطلب',
      );
    }
    return explicitTenantId;
  }
  if (!user.tenantId) {
    throw new ForbiddenException('لا تنتمي لأي محل');
  }
  return user.tenantId;
}

/**
 * يتحقق أن المستخدم يستطيع الوصول لـ tenant معين
 */
export function assertCanAccessTenant(user: AuthUser, tenantId: string) {
  if (user.role === UserRole.PLATFORM_OWNER) return;
  if (user.tenantId === tenantId) return;
  throw new ForbiddenException('غير مصرح بالوصول لهذا المحل');
}
