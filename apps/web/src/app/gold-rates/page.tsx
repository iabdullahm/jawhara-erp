'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingUp, Plus, RefreshCw, Globe } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { formatCurrency, karatLabel } from '@/lib/labels';
import type { GoldRate, Karat, MetalType } from '@/lib/types';

interface TodayRate {
  karat: Karat;
  rate: GoldRate | null;
}

interface SyncResponse {
  success: boolean;
  source: string;
  baseCurrency: string;
  targetCurrency: string;
  fxRate: number;
  fetchedAt: string;
  rates: { karat: Karat; ratePerGram: number; currency: string }[];
  raw: {
    spot_usd_per_oz: number;
    change_pct: number;
    high: number;
    low: number;
  };
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

  // إدخال يدوي
  const manualMutation = useMutation({
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

  // مزامنة من API
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<SyncResponse>('/gold-rates/sync', {
        baseCurrency: 'USD',
        targetCurrency: 'OMR',
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `تم تحديث ${data.rates.length} أسعار من ${data.source}`,
        { description: `سعر الأونصة: $${data.raw.spot_usd_per_oz.toFixed(2)}` },
      );
      qc.invalidateQueries({ queryKey: ['gold-rates'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'فشل تحديث الأسعار';
      toast.error(msg, {
        description:
          msg.includes('GOLD_API_KEY')
            ? 'سجّل في goldapi.io واحصل على مفتاح مجاني'
            : undefined,
      });
    },
  });

  return (
    <AppShell>
      <header className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            أسعار الذهب اليومية
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            هذه الأسعار تُستخدم تلقائياً في حساب أسعار كل القطع المعروضة للبيع
          </p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="btn-gold flex items-center gap-2 disabled:opacity-60"
        >
          <RefreshCw
            className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
          />
          <Globe className="w-4 h-4" />
          {syncMutation.isPending
            ? 'جاري الجلب...'
            : 'تحديث من السوق العالمي'}
        </button>
      </header>

      {/* Banner: how API sync works */}
      <div className="card p-4 mb-6 bg-gradient-to-l from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-700">
            <strong className="text-blue-900">المصدر العالمي:</strong> goldapi.io
            — يجلب سعر الأونصة الفوري (XAU/USD) ويحوّله لكل العيارات بالعملة
            المحلية (ر.ع). الحساب يأخذ بعين الاعتبار نقاء كل عيار:
            <span className="text-xs text-slate-500 block mt-1">
              24K = نقي 100% • 22K = 91.7% • 21K = 87.5% • 18K = 75% • 14K = 58.3%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add new rate (manual) */}
        <section className="card p-6 lg:col-span-1">
          <h2 className="text-base font-bold mb-4 text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            تحديث يدوي
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            استخدم هذا إذا أردت سعراً مخصصاً لفرع معين أو سعر تفاوضي.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              manualMutation.mutate();
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
              disabled={manualMutation.isPending || !rate}
              className="btn-secondary w-full disabled:opacity-50"
            >
              {manualMutation.isPending ? 'جاري الحفظ...' : 'حفظ السعر'}
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
                    <>
                      <div className="text-[11px] text-slate-500 mt-2">
                        آخر تحديث:{' '}
                        {new Date(r.rate.effectiveDate).toLocaleString(
                          'ar-OM',
                          {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </div>
                      {(r.rate as any).source && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          المصدر: {(r.rate as any).source}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 py-8 text-center">
              لا توجد أسعار. اضغط "تحديث من السوق العالمي" أو أدخل سعراً يدوياً.
            </div>
          )}
        </section>
      </div>

      {/* Instructions footer */}
      <section className="card p-4 mt-6 bg-amber-50 border-amber-200">
        <div className="text-xs text-amber-900">
          <strong>إعداد المرة الأولى:</strong> تحتاج مفتاح API مجاني من{' '}
          <a
            href="https://www.goldapi.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            goldapi.io
          </a>{' '}
          (100 طلب مجاناً شهرياً). أضف <code className="bg-amber-100 px-1 rounded">GOLD_API_KEY</code>{' '}
          في متغيرات البيئة على Railway.
        </div>
      </section>
    </AppShell>
  );
}
