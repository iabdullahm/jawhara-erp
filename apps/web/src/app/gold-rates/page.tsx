'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingUp, Plus } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { formatCurrency, karatLabel } from '@/lib/labels';
import type { GoldRate, Karat, MetalType } from '@/lib/types';

interface TodayRate {
  karat: Karat;
  rate: GoldRate | null;
}

const KARATS: Karat[] = ['K24', 'K22', 'K21', 'K18', 'K14'];

export default function GoldRatesPage() {
  const qc = useQueryClient();
  const [karat, setKarat] = useState<Karat>('K22');
  const [rate, setRate] = useState('');

  const { data: today } = useQuery({
    queryKey: ['gold-rates', 'today'],
    queryFn: async () =>
      (await api.get<TodayRate[]>('/gold-rates/today')).data,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/gold-rates', {
        metalType: 'GOLD' as MetalType,
        karat,
        ratePerGram: parseFloat(rate),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('تم حفظ السعر');
      setRate('');
      qc.invalidateQueries({ queryKey: ['gold-rates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'فشل حفظ السعر');
    },
  });

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">أسعار الذهب اليومية</h1>
        <p className="text-sm text-slate-500 mt-1">
          هذه الأسعار تُستخدم تلقائياً في حساب أسعار كل القطع المعروضة للبيع
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add new rate */}
        <section className="card p-6 lg:col-span-1">
          <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            تحديث السعر
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="label">العيار</label>
              <select
                className="input"
                value={karat}
                onChange={(e) => setKarat(e.target.value as Karat)}
              >
                {KARATS.map((k) => (
                  <option key={k} value={k}>
                    {karatLabel[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">السعر لكل جرام (OMR)</label>
              <input
                type="number"
                step="0.001"
                className="input text-lg font-bold"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="مثال: 29.800"
                required
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending || !rate}
              className="btn-gold w-full disabled:opacity-50"
            >
              {mutation.isPending ? 'جاري الحفظ...' : 'حفظ السعر'}
            </button>
          </form>
        </section>

        {/* Current rates */}
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold-600" />
            الأسعار الحالية
          </h2>
          {today && today.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {today.map((r) => (
                <div
                  key={r.karat}
                  className="bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200 rounded-xl p-4"
                >
                  <div className="text-sm font-bold text-gold-700">
                    {karatLabel[r.karat]}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-800">
                    {r.rate
                      ? formatCurrency(r.rate.ratePerGram, r.rate.currency)
                      : '—'}
                  </div>
                  {r.rate && (
                    <div className="text-[11px] text-slate-500 mt-2">
                      آخر تحديث:{' '}
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
              لا توجد أسعار. أضف أول سعر من النموذج جانباً.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
