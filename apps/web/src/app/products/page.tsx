'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Plus, Package } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import {
  formatWeight,
  karatLabel,
  metalLabel,
  statusColor,
  statusLabel,
} from '@/lib/labels';
import type { PaginatedResponse, Product, Karat } from '@/lib/types';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [karat, setKarat] = useState<Karat | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, karat, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: 20 };
      if (search) params.search = search;
      if (karat) params.karat = karat;
      const res = await api.get<PaginatedResponse<Product>>('/products', {
        params,
      });
      return res.data;
    },
  });

  return (
    <AppShell>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">المنتجات</h1>
          <p className="text-sm text-slate-500 mt-1">
            إدارة قطع المجوهرات في المخزون
          </p>
        </div>
        <Link
          href="/products/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          منتج جديد
        </Link>
      </header>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="label">بحث</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="SKU، باركود، اسم..."
              className="input pr-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="w-40">
          <label className="label">العيار</label>
          <select
            className="input"
            value={karat}
            onChange={(e) => {
              setKarat(e.target.value as Karat | '');
              setPage(1);
            }}
          >
            <option value="">الكل</option>
            {(['K24', 'K22', 'K21', 'K18', 'K14'] as Karat[]).map((k) => (
              <option key={k} value={k}>
                {karatLabel[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-right text-slate-600">
              <Th>SKU</Th>
              <Th>الاسم</Th>
              <Th>المعدن/العيار</Th>
              <Th>الوزن الصافي</Th>
              <Th>الأحجار</Th>
              <Th>الفرع</Th>
              <Th>الحالة</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  جاري التحميل...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  لا توجد منتجات. ابدأ بإضافة قطعة جديدة.
                </td>
              </tr>
            ) : (
              data?.items.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <Td className="font-mono text-xs">{p.sku}</Td>
                  <Td>
                    <div className="font-medium text-slate-800">
                      {p.nameAr ?? p.name}
                    </div>
                    {p.designCode && (
                      <div className="text-xs text-slate-400">
                        كود: {p.designCode}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs">
                      {metalLabel[p.metalType]} — {karatLabel[p.karat]}
                    </span>
                  </Td>
                  <Td>{formatWeight(p.netWeight)}</Td>
                  <Td>
                    {p.stones && p.stones.length > 0 ? (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {p.stones.length} حجر
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </Td>
                  <Td>{p.branch?.name ?? '—'}</Td>
                  <Td>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        statusColor[p.status]
                      }`}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`/products/${p.id}`}
                      className="text-primary-600 hover:underline text-xs"
                    >
                      تفاصيل
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              صفحة {data.pagination.page} من {data.pagination.totalPages} •{' '}
              {data.pagination.total} منتج
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                السابق
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-right font-medium text-xs px-4 py-3 uppercase tracking-wider">
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
