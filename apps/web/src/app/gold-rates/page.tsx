'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingUp, Save, Calendar, History } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { formatCurrency, karatLabel } from '@/lib/labels';
import type { GoldRate, Karat } from '@/lib/types';

interface TodayRate {
  karat: Karat;
  rate: GoldRate | null;
}

const KARATS: { karat: Karat; label: string; defaultRate: string }[] = [
  { karat: 'K24', label: 'عيار 24', defaultRate: '36.000' },
  { karat: 'K22', label: 'عيار 22', defaultRate: '33.000' },
  { karat: 'K21', label: 'عيار 21', defaultRate: '31.500' },
  { karat: 'K18', label: 'عيار 18', defaultRate: '27.000' },
  { karat: 'K14', label: 'عيار 14', defaultRate: '21.000' },
];

export default function GoldRatesPage() {
  const qc = useQueryClient();
  const [prices, setPrices] = useState<Record<Karat, string>>({} as any);
  const [notes, setNotes] = useState('');

  const { data: today, isLoading } = useQuery({
    queryKey: ['gold-rates', 'today'],
    queryFn: async () =>
      (await api.get<TodayRate[]>('/gold-rates/today')).data,
  });

  // عند تحميل الصفحة، نملأ القيم بآخر سعر معروف
  useEffect(() => {
    if (today) {
      const initial = {} as Record<Karat, string>;
      KARATS.forEach((k) => {
        const existing = today.find((t) => t.karat === k.karat);
        initial[k.karat] = existing?.rate
          ? Number(existing.rate.ratePerGram).toFixed(3)
          : '';
      });
      setPrices(initial);
    }
  }, [today]);

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const rates = KARATS.filter((k) => prices[k.karat]?.trim())
        .map((k) => ({
          karat: k.karat,
          ratePerGram: parseFloat(prices[k.karat]),
        }))
        .filter((r) => !isNaN(r.ratePerGram) && r.ratePerGram > 0);

      if (rates.length === 0) {
        throw new Error('أدخل سعراً واحداً على الأقل');
      }

      const res = await api.post('/gold-rates/bulk', {
        rates,
        notes: notes || undefined,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`تم حفظ ${data.count} أسعار بنجاح`, {
        description: 'كل المنتجات الديناميكية ستحسب بأسعار اليوم الجديدة',
      });
      setNotes('');
      qc.invalidateQueries({ queryKey: ['gold-rates'] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? err?.response?.data?.message ?? 'فشل الحفظ');
    },
  });

  const todayDate = new Date().toLocaleDateString('ar-OM', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-gold-600" />
          أسعار الذهب اليومية
        </h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <Calendar className="w-4 h-4" />
          <span>{todayDate}</span>
        </div>
      </header>

      {/* البطاقة الرئيسية: التحديث اليومي السريع */}
      <section className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              التحديث اليومي السريع
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              أدخل أسعار اليوم لكل العيارات، ثم اضغط حفظ
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            bulkMutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {KARATS.map((k) => (
              <div
                key={k.karat}
                className="bg-gradient-to-br from-gold-50 to-amber-50 border-2 border-gold-200 rounded-xl p-4 hover:border-gold-400 transition"
              >
                <label className="block text-sm font-bold text-gold-800 mb-2">
                  {k.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    className="input text-xl font-bold text-center pr-12"
                    value={prices[k.karat] ?? ''}
                    onChange={(e) =>
                      setPrices((p) => ({ ...p, [k.karat]: e.target.value }))
                    }
                    placeholder={k.defaultRate}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                    ر.ع/جم
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <label className="label">ملاحظات (اختياري)</label>
            <input
              type="text"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: سعر الصباح، أو سبب التغيير"
            />
          </div>

          <button
            type="submit"
            disabled={bulkMutation.isPending}
            className="btn-gold w-full text-base flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {bulkMutation.isPending ? 'جاري الحفظ...' : 'حفظ أسعار اليوم'}
          </button>
        </form>
      </section>

      {/* عرض الأسعار الحالية */}
      <section className="card p-6">
        <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4" />
          الأسعار الحالية في النظام
        </h2>

        {isLoading ? (
          <div className="text-sm text-slate-400 py-8 text-center">
            جاري التحميل...
          </div>
        ) : today && today.some((t) => t.rate) ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {today.map((r) => (
              <div
                key={r.karat}
                className="bg-white border border-slate-200 rounded-lg p-3"
              >
                <div className="text-xs font-bold text-slate-600">
                  {karatLabel[r.karat]}
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {r.rate
                    ? formatCurrency(r.rate.ratePerGram, r.rate.currency)
                    : '—'}
                </div>
                {r.rate && (
                  <div className="text-[10px] text-slate-400 mt-1">
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
          <div className="text-sm text-slate-400 py-8 text-center">
            لا توجد أسعار محفوظة بعد. أدخل الأسعار في النموذج أعلاه.
          </div>
        )}
      </section>

      {/* نصيحة */}
      <section className="card p-4 mt-6 bg-blue-50 border-blue-200">
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong>💡 نصيحة:</strong> اعتدت إدخال الأسعار صباح كل يوم بعد فتح
          السوق. الأسعار المُدخلة هنا تُستخدم تلقائياً لحساب سعر أي منتج وضعت
          آلية تسعيره
          <code className="bg-blue-100 px-1 rounded mx-1">DYNAMIC</code>
          أو
          <code className="bg-blue-100 px-1 rounded mx-1">HYBRID</code>. أما
          القطع ذات السعر الثابت
          <code className="bg-blue-100 px-1 rounded mx-1">FIXED</code>
          فلن تتأثر.
        </div>
      </section>
    </AppShell>
  );
}
