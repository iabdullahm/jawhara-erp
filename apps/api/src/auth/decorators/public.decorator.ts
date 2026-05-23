import { SetMetadata } from '@nestjs/common';

/**
 * Marks an endpoint as publicly accessible (skips JWT auth).
 * Use sparingly: only on /auth/login, /auth/register, /health.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
