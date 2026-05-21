'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { formatCurrency, karatLabel } from '@/lib/labels';
import { Package, TrendingUp, Store, Coins } from 'lucide-react';
import type { GoldRate } from '@/lib/types';

interface TodayRate {
  karat: string;
  rate: GoldRate | null;
}

export default function DashboardPage() {
  const { data: rates, isLoading: ratesLoading } = useQuery({
    queryKey: ['gold-rates', 'today'],
    queryFn: async () => {
      const res = await api.get<TodayRate[]>('/gold-rates/today');
      return res.data;
    },
  });

  const { data: productStats } = useQuery({
    queryKey: ['products-summary'],
    queryFn: async () => {
      const res = await api.get('/products?pageSize=1');
      return res.data.pagination;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data;
    },
  });

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">لوحة التحكم</h1>
        <p className="text-sm text-slate-500 mt-1">
          نظرة عامة على حالة العمل اليوم
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={<Package className="w-6 h-6" />}
          label="إجمالي المنتجات"
          value={productStats?.total ?? '—'}
          color="primary"
        />
        <KpiCard
          icon={<Store className="w-6 h-6" />}
          label="عدد الفروع"
          value={branches?.length ?? '—'}
          color="gold"
        />
        <KpiCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="مبيعات اليوم"
          value="قادم في وحدة POS"
          color="emerald"
          small
        />
        <KpiCard
          icon={<Coins className="w-6 h-6" />}
          label="عيارات نشطة"
          value={rates?.length ?? '—'}
          color="purple"
        />
      </div>

      {/* Gold Rates */}
      <section className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              أسعار الذهب اليوم
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              السعر لكل جرام — تُستخدم تلقائياً في حساب أسعار المنتجات
            </p>
          </div>
          <a href="/gold-rates" className="text-sm text-primary-600 hover:underline">
            إدارة الأسعار ←
          </a>
        </div>

        {ratesLoading ? (
          <div className="text-sm text-slate-400">جاري التحميل...</div>
        ) : rates && rates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {rates.map((r) => (
              <div
                key={r.karat}
                className="bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200 rounded-lg p-4"
              >
                <div className="text-xs font-medium text-gold-700">
                  {karatLabel[r.karat as keyof typeof karatLabel] ?? r.karat}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-800">
                  {r.rate
                    ? formatCurrency(r.rate.ratePerGram, r.rate.currency)
                    : '—'}
                </div>
                {r.rate && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    {new Date(r.rate.effectiveDate).toLocaleString('ar-OM', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">
            لا توجد أسعار محفوظة. أضف سعر الذهب اليومي من صفحة "أسعار الذهب".
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickAction
            href="/products/new"
            label="إضافة منتج جديد"
            sub="أدخل قطعة مجوهرات للمخزون"
          />
          <QuickAction
            href="/gold-rates"
            label="تحديث سعر الذهب"
            sub="إدخال السعر اليومي للعيارات"
          />
          <QuickAction
            href="/products"
            label="استعراض المخزون"
            sub="بحث وتصفية المنتجات"
          />
        </div>
      </section>
    </AppShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'primary' | 'gold' | 'emerald' | 'purple';
  small?: boolean;
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-700',
    gold: 'bg-gold-50 text-gold-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-slate-500">{label}</div>
          <div
            className={`mt-2 font-bold text-slate-800 ${
              small ? 'text-sm' : 'text-2xl'
            }`}
          >
            {value}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-lg border border-slate-200 hover:border-primary-400 hover:bg-primary-50 transition"
    >
      <div className="font-semibold text-slate-800">{label}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </a>
  );
}
