'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { Branch, Category, Karat, MetalType } from '@/lib/types';

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
  makingCharge: string;
  makingChargePerGram: string;
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
  makingCharge: '0',
  makingChargePerGram: '0',
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
      makingCharge: parseFloat(form.makingCharge || '0'),
      makingChargePerGram: parseFloat(form.makingChargePerGram || '0'),
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

        {/* Pricing */}
        <section className="card p-6">
          <h2 className="text-base font-bold mb-4 text-slate-800">
            التسعير (أجرة الصياغة)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
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
