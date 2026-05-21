'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'المنتجات', href: '/products', icon: Package },
  { name: 'التصنيفات', href: '/categories', icon: Tag },
  { name: 'أسعار الذهب', href: '/gold-rates', icon: TrendingUp },
  { name: 'الفروع', href: '/branches', icon: Store },
  { name: 'حركات المخزون', href: '/stock-movements', icon: ArrowLeftRight },
  // قادمة لاحقاً:
  { name: 'نقطة البيع (POS)', href: '/pos', icon: ShoppingCart, soon: true },
  { name: 'العملاء', href: '/customers', icon: Users, soon: true },
  { name: 'التقارير', href: '/reports', icon: FileText, soon: true },
  { name: 'الإعدادات', href: '/settings', icon: Settings, soon: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold">
              ج
            </div>
            <div>
              <div className="text-base font-bold text-slate-800">JawharaERP</div>
              <div className="text-xs text-slate-500">نظام إدارة المجوهرات</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navigation.map((item) => {
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

        <div className="p-3 border-t border-slate-200">
          <div className="text-xs text-slate-400 text-center">
            الإصدار 0.1.0 — MVP
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
