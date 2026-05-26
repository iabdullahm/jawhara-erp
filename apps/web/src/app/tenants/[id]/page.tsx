'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight,
  Building2,
  Users,
  Store as StoreIcon,
  Package,
  Calendar,
  Phone,
  Mail,
  MapPin,
  PauseCircle,
  PlayCircle,
  Trash2,
  Crown,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';

interface TenantDetail {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  businessNumber?: string | null;
  taxNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  country: string;
  currency: string;
  locale: string;
  logoUrl?: string | null;
  isActive: boolean;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
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

const statusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'نشط',
  EXPIRED: 'منتهي',
  SUSPENDED: 'موقوف',
  CANCELED: 'ملغي',
};

const planOptions: SubscriptionPlan[] = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'];

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id;

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: async () => (await api.get<TenantDetail>(`/tenants/${id}`)).data,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: SubscriptionPlan) =>
      (await api.patch(`/tenants/${id}/subscription`, { plan })).data,
    onSuccess: () => {
      toast.success('تم تحديث الخطة');
      qc.invalidateQueries({ queryKey: ['tenant', id] });
      qc.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'فشل التحديث'),
  });

  const suspendMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/tenants/${id}/suspend`)).data,
    onSuccess: () => {
      toast.success('تم إيقاف المحل');
      qc.invalidateQueries({ queryKey: ['tenant', id] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/tenants/${id}/reactivate`)).data,
    onSuccess: () => {
      toast.success('تم تفعيل المحل');
      qc.invalidateQueries({ queryKey: ['tenant', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      (await api.delete(`/tenants/${id}`)).data,
    onSuccess: () => {
      toast.success('تم حذف المحل');
      router.push('/tenants');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'فشل الحذف'),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="text-slate-400 text-sm">جاري التحميل...</div>
      </AppShell>
    );
  }

  if (!tenant) {
    return (
      <AppShell>
        <div className="text-slate-500">المحل غير موجود</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        onClick={() => router.push('/tenants')}
        className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-700"
      >
        <ArrowRight className="w-4 h-4" />
        كل المحلات
      </button>

      {/* Header */}
      <header className="card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              {(tenant.nameAr ?? tenant.name).charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {tenant.nameAr ?? tenant.name}
              </h1>
              <div className="text-sm text-slate-500 mt-1 font-mono">
                {tenant.slug}
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded ${
                    tenant.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : tenant.status === 'SUSPENDED'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {statusLabels[tenant.status]}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded bg-purple-100 text-purple-700">
                  {planLabels[tenant.plan]}
                </span>
                {tenant.trialEndsAt && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded bg-amber-100 text-amber-700">
                    تجريبي حتى {new Date(tenant.trialEndsAt).toLocaleDateString('ar-OM')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {tenant.status === 'ACTIVE' ? (
              <button
                onClick={() => {
                  if (confirm(`إيقاف "${tenant.nameAr ?? tenant.name}" مؤقتاً؟`))
                    suspendMutation.mutate();
                }}
                className="px-4 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 flex items-center gap-2"
              >
                <PauseCircle className="w-4 h-4" />
                إيقاف
              </button>
            ) : (
              <button
                onClick={() => reactivateMutation.mutate()}
                className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                تفعيل
              </button>
            )}
            <button
              onClick={() => {
                if (
                  confirm(
                    `هل أنت متأكد من حذف "${tenant.nameAr ?? tenant.name}"؟ هذا الإجراء لن يحذف البيانات فوراً (Soft Delete).`,
                  )
                )
                  deleteMutation.mutate();
              }}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Info */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6">
            <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              معلومات المحل
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row label="الاسم الإنجليزي" value={tenant.name} />
              <Row label="السجل التجاري" value={tenant.businessNumber ?? '—'} />
              <Row label="الرقم الضريبي" value={tenant.taxNumber ?? '—'} />
              <Row
                label="رقم الهاتف"
                value={tenant.phone ?? '—'}
                icon={<Phone className="w-3.5 h-3.5" />}
              />
              <Row
                label="البريد الإلكتروني"
                value={tenant.email ?? '—'}
                icon={<Mail className="w-3.5 h-3.5" />}
              />
              <Row
                label="العنوان"
                value={tenant.address ?? '—'}
                icon={<MapPin className="w-3.5 h-3.5" />}
                className="md:col-span-2"
              />
              <Row label="الدولة" value={tenant.country} />
              <Row label="العملة" value={tenant.currency} />
              <Row label="اللغة الافتراضية" value={tenant.locale} />
              <Row
                label="تاريخ الإنشاء"
                value={new Date(tenant.createdAt).toLocaleDateString('ar-OM')}
                icon={<Calendar className="w-3.5 h-3.5" />}
              />
            </dl>
          </section>

          {/* Subscription */}
          <section className="card p-6">
            <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              إدارة الاشتراك
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">الخطة الحالية</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {planOptions.map((p) => (
                    <button
                      key={p}
                      onClick={() => updatePlanMutation.mutate(p)}
                      disabled={tenant.plan === p || updatePlanMutation.isPending}
                      className={[
                        'p-3 rounded-lg border-2 text-center text-sm font-medium transition',
                        tenant.plan === p
                          ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {planLabels[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right - Stats */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              الاستخدام الحالي
            </h3>
            <UsageRow
              icon={<Users className="w-4 h-4" />}
              label="المستخدمين"
              current={tenant._count?.users ?? 0}
              max={tenant.maxUsers}
            />
            <UsageRow
              icon={<StoreIcon className="w-4 h-4" />}
              label="الفروع"
              current={tenant._count?.branches ?? 0}
              max={tenant.maxBranches}
            />
            <UsageRow
              icon={<Package className="w-4 h-4" />}
              label="المنتجات"
              current={tenant._count?.products ?? 0}
              max={tenant.maxProducts}
              last
            />
          </div>

          <div className="card p-5 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-bold text-blue-900 mb-2">
              💡 معلومة
            </h3>
            <p className="text-xs text-blue-800 leading-relaxed">
              هذا المحل يرى بياناته فقط (Tenant Isolation). لا يستطيع أي مستخدم
              فيه رؤية بيانات محل آخر.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  icon,
  className = '',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`contents ${className}`}>
      <dt className="text-slate-500 flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-slate-800 font-medium">{value}</dd>
    </div>
  );
}

function UsageRow({
  icon,
  label,
  current,
  max,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
  last?: boolean;
}) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className={last ? '' : 'mb-4'}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
          {icon}
          {label}
        </span>
        <span className="text-slate-500 font-mono">
          {current} / {max}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
