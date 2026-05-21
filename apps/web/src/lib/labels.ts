import type { Karat, MetalType, ProductStatus } from './types';

export const karatLabel: Record<Karat, string> = {
  K24: 'عيار 24',
  K22: 'عيار 22',
  K21: 'عيار 21',
  K18: 'عيار 18',
  K14: 'عيار 14',
  K10: 'عيار 10',
  K925: 'فضة 925',
  K950: 'بلاتين 950',
  OTHER: 'أخرى',
};

export const metalLabel: Record<MetalType, string> = {
  GOLD: 'ذهب',
  SILVER: 'فضة',
  PLATINUM: 'بلاتين',
  PALLADIUM: 'بلاديوم',
  OTHER: 'أخرى',
};

export const statusLabel: Record<ProductStatus, string> = {
  IN_STOCK: 'متوفر',
  SOLD: 'مُباع',
  RESERVED: 'محجوز',
  IN_REPAIR: 'في الصيانة',
  IN_MANUFACTURING: 'في التصنيع',
  CONSIGNMENT_OUT: 'بالأمانة',
  LOST: 'مفقود',
  WRITTEN_OFF: 'مشطوب',
};

export const statusColor: Record<ProductStatus, string> = {
  IN_STOCK: 'bg-emerald-100 text-emerald-700',
  SOLD: 'bg-slate-200 text-slate-600',
  RESERVED: 'bg-amber-100 text-amber-700',
  IN_REPAIR: 'bg-orange-100 text-orange-700',
  IN_MANUFACTURING: 'bg-purple-100 text-purple-700',
  CONSIGNMENT_OUT: 'bg-blue-100 text-blue-700',
  LOST: 'bg-red-100 text-red-700',
  WRITTEN_OFF: 'bg-slate-300 text-slate-600',
};

export function formatCurrency(value: number | string, currency = 'OMR') {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(3)} ${currency}`;
}

export function formatWeight(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(3)} جم`;
}
