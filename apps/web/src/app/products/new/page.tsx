'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { Branch, Category, Karat, MetalType, PricingMode } from '@/lib/types';

interface FormState {
  name: string;
  nameAr: string;
  categoryId: string;
  branchId: string;
  metalType: MetalType;
  karat: Karat;
  grossWeight: string;
  netWeight: string;
  stoneWeight: string;
  pricingMode: PricingMode;
  makingCharge: string;
  makingChargePerGram: string;
  fixedSalePrice: string;
  safetyMarginPct: string;
  size: string;
  notes: string;
}

const initial: FormState = {
  name: '',
  nameAr: '',
  categoryId: '',
  branchId: '',
  metalType: 'GOLD',
  karat: 'K22',
  grossWeight: '',
  netWeight: '',
  stoneWeight: '0',
  pricingMode: 'DYNAMIC',
  makingCharge: '0',
  makingChargePerGram: '0',
  fixedSalePrice: '',
  safetyMarginPct: '0',
  size: '',
  notes: '',
};

export default function NewProductPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(initial);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get<Branch[]>('/branches')).data,
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      (await api.get<(Category & { children?: Category[] })[]>('/categories'))
        .data,
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/products', payload);
      return res.data;
    },
    onSuccess: (p) => {
      toast.success(`تم حفظ المنتج: ${p.sku}`);
      qc.invalidateQueries({ queryKey: ['products'] });
      router.push(`/products/${p.id}`);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ?? err.message ?? 'حدث خطأ غير متوقع';
      toast.error(Array.isArray(msg) ? msg.join('، ') : msg);
    },
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      nameAr: form.nameAr || undefined,
      categoryId: form.categoryId,
      branchId: form.branchId,
      metalType: form.metalType,
      karat: form.karat,
      grossWeight: parseFloat(form.grossWeight),
      netWeight: parseFloat(form.netWeight),
      stoneWeight: parseFloat(form.stoneWeight || '0'),
      pricingMode: form.pricingMode,
      makingCharge: parseFloat(form.makingCharge || '0'),
      makingChargePerGram: parseFloat(form.makingChargePerGram || '0'),
      fixedSalePrice: form.fixedSalePrice
        ? parseFloat(form.fixedSalePrice)
        : undefined,
      safetyMarginPct: parseFloat(form.safetyMarginPct || '0'),
      size: form.size || undefined,
      notes: form.notes || undefined,
    };
    mutation.mutate(payload);
  };

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">منتج جديد</h1>
        <p className="text-sm text-slate-500 mt-1">
          إضافة قطعة مجوهرات للمخزون. سيُولَّد SKU و Barcode تلقائياً.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basic */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-4 text-slate-800">
            البيانات الأساسية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الاسم بالعربي *" required>
              <input
                className="input"
                value={form.nameAr}
                onChange={(e) => set('nameAr', e.target.value)}
                placeholder="مثال: خاتم ذهب كلاسيكي"
              />
            </Field>
            <Field label="الاسم بالإنجليزي *" required>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Classic Gold Ring"
                required
              />
            </Field>
            <Field label="التصنيف *" required>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                required
              >
                <option value="">— اختر —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr ?? c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الفرع *" required>
              <select
                className="input"
                value={form.branchId}
                onChange={(e) => set('branchId', e.target.value)}
                required
              >
                <option value="">— اختر —</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr ?? b.name} ({b.code})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Metal */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-4 text-slate-800">المعدن</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="نوع المعدن *">
              <select
                className="input"
                value={form.metalType}
                onChange={(e) => set('metalType', e.target.value as MetalType)}
              >
                <option value="GOLD">ذهب</option>
                <option value="SILVER">فضة</option>
                <option value="PLATINUM">بلاتين</option>
              </select>
            </Field>
            <Field label="العيار *">
              <select
                className="input"
                value={form.karat}
                onChange={(e) => set('karat', e.target.value as Karat)}
              >
                <option value="K24">عيار 24</option>
                <option value="K22">عيار 22</option>
                <option value="K21">عيار 21</option>
                <option value="K18">عيار 18</option>
                <option value="K14">عيار 14</option>
                <option value="K925">فضة 925</option>
                <option value="K950">بلاتين 950</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Weights */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-4 text-slate-800">
            الأوزان (بالجرام)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            تذكير: <span className="font-medium">الوزن الصافي + وزن الأحجار = الوزن الإجمالي</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="الوزن الإجمالي *" required>
              <input
                type="number"
                step="0.001"
                className="input"
                value={form.grossWeight}
                onChange={(e) => set('grossWeight', e.target.value)}
                placeholder="0.000"
                required
              />
            </Field>
            <Field label="وزن المعدن الصافي *" required>
              <input
                type="number"
                step="0.001"
                className="input"
                value={form.netWeight}
                onChange={(e) => set('netWeight', e.target.value)}
                placeholder="0.000"
                required
              />
            </Field>
            <Field label="وزن الأحجار">
              <input
                type="number"
                step="0.001"
                className="input"
                value={form.stoneWeight}
                onChange={(e) => set('stoneWeight', e.target.value)}
                placeholder="0.000"
              />
            </Field>
          </div>
        </section>

        {/* Pricing Mode - الجزء الأهم */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-2 text-slate-800">
            آلية التسعير
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            اختر كيف يُحسب سعر هذه القطعة عند البيع
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <PricingCard
              mode="DYNAMIC"
              selected={form.pricingMode === 'DYNAMIC'}
              onSelect={() => set('pricingMode', 'DYNAMIC')}
              title="ديناميكي"
              subtitle="يتبع سعر الذهب اليومي"
              formula="السعر = (الوزن × سعر اليوم) + الأجرة"
              best="السبائك، السلاسل، الأساور، الخواتم البسيطة"
              color="emerald"
            />
            <PricingCard
              mode="FIXED"
              selected={form.pricingMode === 'FIXED'}
              onSelect={() => set('pricingMode', 'FIXED')}
              title="سعر ثابت"
              subtitle="لا يتأثر بسعر الذهب"
              formula="السعر = القيمة التي أدخلتها"
              best="الماس، الأحجار الكريمة، الأنتيك، العلامات التجارية"
              color="purple"
            />
            <PricingCard
              mode="HYBRID"
              selected={form.pricingMode === 'HYBRID'}
              onSelect={() => set('pricingMode', 'HYBRID')}
              title="هجين (مزيج)"
              subtitle="الأكبر بين الثابت والديناميكي"
              formula="السعر = max(ثابت، ديناميكي)"
              best="قطع لها قيمة فنية + حماية من ارتفاع الذهب"
              color="amber"
            />
          </div>

          {/* أجرة الصياغة - تُستخدم في DYNAMIC و HYBRID */}
          {(form.pricingMode === 'DYNAMIC' ||
            form.pricingMode === 'HYBRID') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <Field label="أجرة الصياغة مقطوعة (OMR)">
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  value={form.makingCharge}
                  onChange={(e) => set('makingCharge', e.target.value)}
                />
              </Field>
              <Field label="أجرة الصياغة لكل جرام (OMR)">
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  value={form.makingChargePerGram}
                  onChange={(e) => set('makingChargePerGram', e.target.value)}
                />
              </Field>
              <Field label="هامش الأمان % (اختياري)">
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.safetyMarginPct}
                  onChange={(e) => set('safetyMarginPct', e.target.value)}
                  placeholder="مثلاً 2 = +2% فوق سعر السوق"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  حماية من تقلبات اليوم. مثلاً 2% يضيف 2% فوق السعر الديناميكي.
                </p>
              </Field>
            </div>
          )}

          {/* السعر الثابت - يُستخدم في FIXED و HYBRID */}
          {(form.pricingMode === 'FIXED' || form.pricingMode === 'HYBRID') && (
            <div className="pt-4 border-t border-slate-200 mt-4">
              <Field
                label={
                  form.pricingMode === 'FIXED'
                    ? 'سعر البيع الثابت (OMR) *'
                    : 'الحد الأدنى للسعر (OMR) *'
                }
                required
              >
                <input
                  type="number"
                  step="0.001"
                  className="input text-lg font-bold"
                  value={form.fixedSalePrice}
                  onChange={(e) => set('fixedSalePrice', e.target.value)}
                  placeholder="مثلاً 850.000"
                  required={
                    form.pricingMode === 'FIXED' ||
                    form.pricingMode === 'HYBRID'
                  }
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {form.pricingMode === 'FIXED'
                    ? 'هذا السعر سيُعرض للعميل بغض النظر عن تغيرات الذهب.'
                    : 'لن ينزل سعر القطعة عن هذا الحد حتى لو نزل الذهب.'}
                </p>
              </Field>
            </div>
          )}
        </section>

        {/* Extra */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-4 text-slate-800">إضافات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="المقاس (للخواتم/الأساور)">
              <input
                className="input"
                value={form.size}
                onChange={(e) => set('size', e.target.value)}
                placeholder="18"
              />
            </Field>
            <Field label="ملاحظات">
              <input
                className="input"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3 sticky bottom-0 bg-slate-50/80 backdrop-blur py-4">
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
            className="btn-gold disabled:opacity-60"
          >
            {mutation.isPending ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function PricingCard({
  mode,
  selected,
  onSelect,
  title,
  subtitle,
  formula,
  best,
  color,
}: {
  mode: PricingMode;
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  formula: string;
  best: string;
  color: 'emerald' | 'purple' | 'amber';
}) {
  const colorClasses = {
    emerald: {
      border: 'border-emerald-500 ring-emerald-200 bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-700',
    },
    purple: {
      border: 'border-purple-500 ring-purple-200 bg-purple-50',
      badge: 'bg-purple-100 text-purple-700',
    },
    amber: {
      border: 'border-amber-500 ring-amber-200 bg-amber-50',
      badge: 'bg-amber-100 text-amber-700',
    },
  };
  const c = colorClasses[color];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'text-right p-4 rounded-xl border-2 transition cursor-pointer',
        selected
          ? `${c.border} ring-4`
          : 'border-slate-200 hover:border-slate-300 bg-white',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${c.badge}`}
        >
          {mode}
        </span>
        {selected && (
          <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">
            ✓
          </span>
        )}
      </div>
      <div className="font-bold text-slate-800">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
      <div className="text-[11px] text-slate-600 mt-3 font-mono bg-white/60 rounded px-2 py-1 border border-slate-200">
        {formula}
      </div>
      <div className="text-[11px] text-slate-500 mt-2">
        <span className="font-medium">الأنسب لـ:</span> {best}
      </div>
    </button>
  );
}
