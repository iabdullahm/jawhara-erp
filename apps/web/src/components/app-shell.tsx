'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Tag,
  TrendingUp,
  Store,
  ArrowLeftRight,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  LogOut,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { clearAuth, getUser, isAuthenticated, type AuthenticatedUser } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  soon?: boolean;
  roles?: UserRole[];
}

const navigation: NavItem[] = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'المنتجات', href: '/products', icon: Package },
  { name: 'التصنيفات', href: '/categories', icon: Tag },
  { name: 'أسعار الذهب', href: '/gold-rates', icon: TrendingUp },
  { name: 'الفروع', href: '/branches', icon: Store },
  { name: 'حركات المخزون', href: '/stock-movements', icon: ArrowLeftRight },
  {
    name: 'المستخدمين',
    href: '/users',
    icon: Users,
    roles: ['PLATFORM_OWNER', 'TENANT_OWNER', 'MANAGER'],
  },
  {
    name: 'المحلات',
    href: '/tenants',
    icon: Building2,
    roles: ['PLATFORM_OWNER'],
  },
  { name: 'نقطة البيع (POS)', href: '/pos', icon: ShoppingCart, soon: true },
  { name: 'العملاء', href: '/customers', icon: Users, soon: true },
  { name: 'التقارير', href: '/reports', icon: FileText, soon: true },
  { name: 'الإعدادات', href: '/settings', icon: Settings, soon: true },
];

const roleLabels: Record<UserRole, string> = {
  PLATFORM_OWNER: 'مالك المنصة',
  TENANT_OWNER: 'مالك المحل',
  MANAGER: 'مدير الفرع',
  SALESPERSON: 'بائع',
  ACCOUNTANT: 'محاسب',
  GOLDSMITH: 'صائغ',
  CASHIER: 'كاشير',
  VIEWER: 'قراءة فقط',
};

const roleBadgeColors: Record<UserRole, string> = {
  PLATFORM_OWNER: 'bg-purple-100 text-purple-700',
  TENANT_OWNER: 'bg-gold-100 text-gold-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  SALESPERSON: 'bg-emerald-100 text-emerald-700',
  ACCOUNTANT: 'bg-amber-100 text-amber-700',
  GOLDSMITH: 'bg-orange-100 text-orange-700',
  CASHIER: 'bg-teal-100 text-teal-700',
  VIEWER: 'bg-slate-100 text-slate-600',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<AuthenticatedUser | null>(null);
  const [checked, setChecked] = useState(false);

  // Auth gate: حماية كل الصفحات
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    setUserState(getUser());
    setChecked(true);
  }, [pathname, router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  // أثناء التحقق، لا نعرض شيئاً (تجنب وميض المحتوى المحمي)
  if (!checked || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">جاري التحقق...</div>
      </div>
    );
  }

  const visibleNav = navigation.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold">
              ج
            </div>
            <div>
              <div className="text-base font-bold text-slate-800">JawharaERP</div>
              <div className="text-xs text-slate-500">
                {user.tenant?.nameAr ?? user.tenant?.name ?? 'منصة المالك'}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.soon ? '#' : item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  item.soon && 'opacity-50 cursor-not-allowed',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {item.soon && (
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                    قريباً
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm">
              {(user.nameAr ?? user.name).charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                {user.nameAr ?? user.name}
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${roleBadgeColors[user.role]}`}
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
          <div className="text-[10px] text-slate-400 text-center mt-2">
            الإصدار 0.2.0 — Multi-Tenant
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
