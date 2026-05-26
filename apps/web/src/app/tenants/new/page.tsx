'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Building2, User, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

interface FormState {
  // Tenant
  tenantName: string;
  tenantNameEn: string;
  tenantSlug: string;
  tenantPhone: string;
  tenantAddress: string;
  // Owner
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

const initial: FormState = {
  tenantName: '',
  tenantNameEn: '',
  tenantSlug: '',
  tenantPhone: '',
  tenantAddress: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
};

export default function NewTenantPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [showPassword, setShowPassword] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // توليد slug تلقائي من الاسم الإنجليزي
  const handleNameEnChange = (val: string) => {
    set('tenantNameEn', val);
    if (!form.tenantSlug || form.tenantSlug === slugify(form.tenantNameEn)) {
      set('tenantSlug', slugify(val));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/register-tenant', {
        tenantName: form.tenantName,
        tenantNameEn: form.tenantNameEn || undefined,
        tenantSlug: form.tenantSlug.toLowerCase(),
        tenantPhone: form.tenantPhone || undefined,
        tenantAddress: form.tenantAddress || undefined,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail.toLowerCase().trim(),
        ownerPassword: form.ownerPassword,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`تم إنشاء محل "${data.tenant?.nameAr ?? data.tenant?.name}" بنجاح`, {
        description: `صاحب المحل: ${data.owner?.email}`,
      });
      router.push('/tenants');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'فشل إنشاء المحل';
      toast.error(Array.isArray(msg) ? msg.join('، ') : msg);
    },
  });

  return (
    <AppShell>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-700"
      >
        <ArrowRight className="w-4 h-4" />
        رجوع
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary-600" />
          إضافة محل جديد
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          إنشاء محل جديد + حساب لمالكه على المنصة
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-6"
      >
        {/* Tenant Info */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            بيانات المحل
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الاسم بالعربي *">
              <input
                className="input"
                value={form.tenantName}
                onChange={(e) => set('tenantName', e.target.value)}
                placeholder="مثال: مجوهرات النجم"
                required
              />
            </Field>
            <Field label="الاسم بالإنجليزي">
              <input
                className="input"
                value={form.tenantNameEn}
                onChange={(e) => handleNameEnChange(e.target.value)}
                placeholder="Najm Jewelry"
                dir="ltr"
              />
            </Field>
            <Field label="الـ slug (معرّف فريد بالإنجليزي) *">
              <input
                className="input font-mono"
                value={form.tenantSlug}
                onChange={(e) => set('tenantSlug', slugify(e.target.value))}
                placeholder="najm-jewelry"
                pattern="[a-z0-9-]+"
                required
                dir="ltr"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                حروف صغيرة وأرقام وشرطات فقط
              </p>
            </Field>
            <Field label="رقم الهاتف">
              <input
                className="input"
                value={form.tenantPhone}
                onChange={(e) => set('tenantPhone', e.target.value)}
                placeholder="+96812345678"
                dir="ltr"
              />
            </Field>
            <Field label="العنوان" className="md:col-span-2">
              <input
                className="input"
                value={form.tenantAddress}
                onChange={(e) => set('tenantAddress', e.target.value)}
                placeholder="الموج، مسقط، سلطنة عُمان"
              />
            </Field>
          </div>
        </section>

        {/* Owner Info */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4" />
            بيانات صاحب المحل (TENANT_OWNER)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            هذا الشخص سيكون له صلاحية إدارة كل شيء داخل محله — موظفين، فروع، منتجات، فواتير.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الاسم الكامل *">
              <input
                className="input"
                value={form.ownerName}
                onChange={(e) => set('ownerName', e.target.value)}
                placeholder="محمد العمري"
                required
              />
            </Field>
            <Field label="البريد الإلكتروني *">
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className="input pr-9"
                  value={form.ownerEmail}
                  onChange={(e) => set('ownerEmail', e.target.value)}
                  placeholder="owner@najm.com"
                  required
                  dir="ltr"
                />
              </div>
            </Field>
            <Field label="كلمة المرور المؤقتة *" className="md:col-span-2">
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-9 pl-9"
                  value={form.ownerPassword}
                  onChange={(e) => set('ownerPassword', e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  minLength={8}
                  required
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                يمكن للمالك تغييرها بعد أول دخول
              </p>
            </Field>
          </div>
        </section>

        {/* Trial Notice */}
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="text-xs text-amber-900">
            <strong>📋 ملاحظة:</strong> سيبدأ المحل بفترة تجريبية مجانية لمدة <strong>30 يوم</strong>.
            بإمكانك ترقية الاشتراك أو إيقافه لاحقاً من صفحة تفاصيل المحل.
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary disabled:opacity-60"
          >
            {mutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المحل'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
