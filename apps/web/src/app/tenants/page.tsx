'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Building2,
  Users,
  Store as StoreIcon,
  Package,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Calendar,
  Crown,
  Search,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  country: string;
  currency: string;
  isActive: boolean;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  _count?: {
    users: number;
    branches: number;
    products: number;
  };
}

const planLabels: Record<SubscriptionPlan, string> = {
  TRIAL: 'تجريبي',
  BASIC: 'أساسي',
  PRO: 'احترافي',
  ENTERPRISE: 'مؤسسات',
};

const planColors: Record<SubscriptionPlan, string> = {
  TRIAL: 'bg-amber-100 text-amber-700 border-amber-200',
  BASIC: 'bg-slate-100 text-slate-700 border-slate-200',
  PRO: 'bg-blue-100 text-blue-700 border-blue-200',
  ENTERPRISE: 'bg-purple-100 text-purple-700 border-purple-200',
};

const statusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'نشط',
  EXPIRED: 'منتهي',
  SUSPENDED: 'موقوف',
  CANCELED: 'ملغي',
};

const statusColors: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  CANCELED: 'bg-slate-200 text-slate-600',
};

export default function TenantsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => (await api.get<TenantRow[]>('/tenants')).data,
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/tenants/${id}/suspend`)).data,
    onSuccess: () => {
      toast.success('تم إيقاف المحل');
      qc.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'فشل الإيقاف'),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/tenants/${id}/reactivate`)).data,
    onSuccess: () => {
      toast.success('تم تفعيل المحل');
      qc.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'فشل التفعيل'),
  });

  const filtered = tenants?.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(s) ||
      t.nameAr?.toLowerCase().includes(s) ||
      t.slug.toLowerCase().includes(s) ||
      t.email?.toLowerCase().includes(s)
    );
  });

  const totals = {
    all: tenants?.length ?? 0,
    active: tenants?.filter((t) => t.isActive && t.status === 'ACTIVE').length ?? 0,
    trial: tenants?.filter((t) => t.plan === 'TRIAL').length ?? 0,
    suspended:
      tenants?.filter((t) => t.status === 'SUSPENDED').length ?? 0,
  };

  return (
    <AppShell>
      <header className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Crown className="w-6 h-6 text-purple-600" />
            إدارة المحلات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            إضافة وإدارة وإيقاف محلات العملاء على المنصة
          </p>
        </div>
        <Link
          href="/tenants/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة محل جديد
        </Link>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Building2 className="w-5 h-5" />}
          label="إجمالي المحلات"
          value={totals.all}
          color="primary"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="المحلات النشطة"
          value={totals.active}
          color="emerald"
        />
        <KpiCard
          icon={<Calendar className="w-5 h-5" />}
          label="فترة تجريبية"
          value={totals.trial}
          color="amber"
        />
        <KpiCard
          icon={<PauseCircle className="w-5 h-5" />}
          label="موقوفة"
          value={totals.suspended}
          color="red"
        />
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الإيميل، أو slug..."
            className="input pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tenants List */}
      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">جاري التحميل...</div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((t) => (
            <article key={t.id} className="card p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {(t.nameAr ?? t.name).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-800">
                        {t.nameAr ?? t.name}
                      </h3>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${planColors[t.plan]}`}
                      >
                        {planLabels[t.plan]}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded ${statusColors[t.status]}`}
                      >
                        {statusLabels[t.status]}
                      </span>
                      {!t.isActive && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-100 text-red-700">
                          غير مفعّل
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      {t.slug}
                    </div>
                    {(t.email || t.phone) && (
                      <div className="text-xs text-slate-500 mt-1 flex gap-3 flex-wrap">
                        {t.email && <span>📧 {t.email}</span>}
                        {t.phone && <span>📞 {t.phone}</span>}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 mt-3 text-xs text-slate-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {t._count?.users ?? 0} مستخدم
                      </span>
                      <span className="flex items-center gap-1">
                        <StoreIcon className="w-3.5 h-3.5" />
                        {t._count?.branches ?? 0} فرع
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {t._count?.products ?? 0} منتج
                      </span>
                      {t.trialEndsAt && (
                        <span className="flex items-center gap-1 text-amber-700">
                          <Calendar className="w-3.5 h-3.5" />
                          الفترة التجريبية تنتهي{' '}
                          {new Date(t.trialEndsAt).toLocaleDateString('ar-OM')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/tenants/${t.id}`}
                    className="btn-secondary text-xs"
                  >
                    تفاصيل
                  </Link>
                  {t.status === 'ACTIVE' ? (
                    <button
                      onClick={() => {
                        if (confirm(`إيقاف "${t.nameAr ?? t.name}" مؤقتاً؟`))
                          suspendMutation.mutate(t.id);
                      }}
                      disabled={suspendMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 flex items-center gap-1"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      إيقاف
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivateMutation.mutate(t.id)}
                      disabled={reactivateMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      تفعيل
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 mb-4">
            {search ? 'لم يتم العثور على محلات تطابق البحث' : 'لا توجد محلات بعد'}
          </p>
          <Link
            href="/tenants/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة أول محل
          </Link>
        </div>
      )}
    </AppShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'primary' | 'emerald' | 'amber' | 'red';
}) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
        </div>
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
