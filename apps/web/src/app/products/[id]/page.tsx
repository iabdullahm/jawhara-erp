'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import {
  formatCurrency,
  formatWeight,
  karatLabel,
  metalLabel,
  statusColor,
  statusLabel,
} from '@/lib/labels';
import type { PriceBreakdown, Product } from '@/lib/types';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
  });

  const priceQuery = useMutation({
    mutationFn: async () =>
      (await api.get<PriceBreakdown>(`/products/${id}/price`)).data,
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'فشل حساب السعر');
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="text-slate-400 text-sm">جاري التحميل...</div>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell>
        <div className="text-slate-500">المنتج غير موجود</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-700"
      >
        <ArrowRight className="w-4 h-4" />
        رجوع
      </button>

      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {product.nameAr ?? product.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">
            {product.sku} • {product.barcode}
          </p>
        </div>
        <span
          className={`text-sm font-medium px-3 py-1 rounded ${
            statusColor[product.status]
          }`}
        >
          {statusLabel[product.status]}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6">
            <h2 className="text-base font-bold mb-4 text-slate-800">
              تفاصيل المعدن
            </h2>
            <DataGrid
              rows={[
                ['نوع المعدن', metalLabel[product.metalType]],
                ['العيار', karatLabel[product.karat]],
                ['الوزن الإجمالي', formatWeight(product.grossWeight)],
                ['الوزن الصافي', formatWeight(product.netWeight)],
                ['وزن الأحجار', formatWeight(product.stoneWeight)],
                ['البصمة', product.hallmark ?? '—'],
              ]}
            />
          </section>

          {product.stones && product.stones.length > 0 && (
            <section className="card p-6">
              <h2 className="text-base font-bold mb-4 text-slate-800">
                الأحجار ({product.stones.length})
              </h2>
              <div className="space-y-3">
                {product.stones.map((s) => (
                  <div
                    key={s.id}
                    className="border border-slate-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-800">
                        {s.stoneTypeAr ?? s.stoneType}
                      </div>
                      <div className="text-sm text-slate-500">
                        {s.count} حبة • {s.caratWeight} قيراط
                      </div>
                    </div>
                    {(s.clarity || s.color || s.cut || s.certificateNo) && (
                      <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-3">
                        {s.clarity && <span>نقاء: {s.clarity}</span>}
                        {s.color && <span>لون: {s.color}</span>}
                        {s.cut && <span>قَص: {s.cut}</span>}
                        {s.certificateNo && (
                          <span>شهادة: {s.certificateNo}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card p-6">
            <h2 className="text-base font-bold mb-4 text-slate-800">
              المخزون والتسعير
            </h2>
            <DataGrid
              rows={[
                ['الفرع', product.branch?.name ?? '—'],
                ['التصنيف', product.category?.nameAr ?? product.category?.name ?? '—'],
                [
                  'أجرة الصياغة (مقطوعة)',
                  formatCurrency(product.makingCharge),
                ],
                [
                  'أجرة الصياغة بالجرام',
                  formatCurrency(product.makingChargePerGram),
                ],
                ['المقاس', product.size ?? '—'],
                ['كود التصميم', product.designCode ?? '—'],
              ]}
            />
          </section>
        </div>

        {/* Right: Price Calculator */}
        <div className="space-y-6">
          <section className="card p-6 bg-gradient-to-br from-gold-50 to-amber-50 border-gold-200">
            <h2 className="text-base font-bold mb-3 text-gold-800">
              السعر الحالي
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              يُحسب لحظياً بناءً على سعر الذهب اليومي
            </p>

            <button
              onClick={() => priceQuery.mutate()}
              disabled={priceQuery.isPending}
              className="btn-gold w-full flex items-center justify-center gap-2 mb-4"
            >
              <RefreshCw
                className={`w-4 h-4 ${priceQuery.isPending ? 'animate-spin' : ''}`}
              />
              {priceQuery.isPending ? 'جاري الحساب...' : 'احسب السعر الآن'}
            </button>

            {priceQuery.data && (
              <div className="space-y-2 text-sm">
                {priceQuery.data.method === 'computed' && (
                  <>
                    <Row
                      label="قيمة المعدن"
                      value={formatCurrency(
                        priceQuery.data.breakdown.goldValue ?? 0,
                      )}
                    />
                    {(priceQuery.data.breakdown.stonesValue ?? 0) > 0 && (
                      <Row
                        label="قيمة الأحجار"
                        value={formatCurrency(
                          priceQuery.data.breakdown.stonesValue ?? 0,
                        )}
                      />
                    )}
                    <Row
                      label="أجرة الصياغة"
                      value={formatCurrency(
                        priceQuery.data.breakdown.makingCharge ?? 0,
                      )}
                    />
                    <div className="border-t border-gold-300 pt-2 mt-2">
                      <Row
                        label="السعر الإجمالي"
                        value={formatCurrency(priceQuery.data.finalPrice)}
                        bold
                      />
                    </div>
                    {priceQuery.data.goldRate && (
                      <p className="text-[11px] text-slate-500 mt-3">
                        سعر الذهب المُعتمد:{' '}
                        {formatCurrency(
                          priceQuery.data.goldRate.ratePerGram,
                          priceQuery.data.goldRate.currency,
                        )}
                        /جم — {karatLabel[priceQuery.data.goldRate.karat]}
                      </p>
                    )}
                  </>
                )}
                {priceQuery.data.method === 'fixed' && (
                  <Row
                    label="سعر ثابت"
                    value={formatCurrency(priceQuery.data.finalPrice)}
                    bold
                  />
                )}
              </div>
            )}
          </section>

          <section className="card p-6">
            <h3 className="text-sm font-bold mb-3 text-slate-700">
              تاريخ الإدخال
            </h3>
            <div className="text-xs text-slate-500 space-y-1">
              <div>
                دخل المخزون:{' '}
                {product.receivedAt
                  ? new Date(product.receivedAt).toLocaleDateString('ar-OM')
                  : '—'}
              </div>
              <div>
                أُنشئ السجل:{' '}
                {new Date(product.createdAt).toLocaleDateString('ar-OM')}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function DataGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-slate-800 font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-bold text-slate-800' : 'text-slate-600'}>
        {label}
      </span>
      <span className={bold ? 'font-bold text-slate-800 text-base' : ''}>
        {value}
      </span>
    </div>
  );
}
