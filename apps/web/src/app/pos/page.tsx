'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search,
  Scan,
  X,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  ShoppingCart,
  Coins,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import {
  formatCurrency,
  formatWeight,
  karatLabel,
  metalLabel,
} from '@/lib/labels';
import type {
  Branch,
  Customer,
  PaymentMethod,
  Product,
} from '@/lib/types';

interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountReason?: string;
  notes?: string;
}

interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'نقدي',
  CARD: 'بطاقة',
  BANK_TRANSFER: 'تحويل بنكي',
  CHEQUE: 'شيك',
  LOYALTY_POINTS: 'نقاط ولاء',
  OLD_GOLD: 'ذهب قديم',
  CREDIT: 'آجل (مدين)',
  WALLET: 'محفظة',
};

const paymentMethodIcons: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote className="w-4 h-4" />,
  CARD: <CreditCard className="w-4 h-4" />,
  BANK_TRANSFER: <CreditCard className="w-4 h-4" />,
  CHEQUE: <Receipt className="w-4 h-4" />,
  LOYALTY_POINTS: <CheckCircle2 className="w-4 h-4" />,
  OLD_GOLD: <Coins className="w-4 h-4" />,
  CREDIT: <User className="w-4 h-4" />,
  WALLET: <CreditCard className="w-4 h-4" />,
};

export default function POSPage() {
  const router = useRouter();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [branchId, setBranchId] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('CASH');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  // Branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get<Branch[]>('/branches')).data,
  });

  useEffect(() => {
    if (branches && branches.length > 0 && !branchId) {
      setBranchId(branches[0].id);
    }
    barcodeRef.current?.focus();
  }, [branches, branchId]);

  // Customer search (debounced)
  const { data: customerResults } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: async () =>
      (
        await api.get<Customer[]>('/customers/search', {
          params: { q: customerSearch },
        })
      ).data,
    enabled: customerSearch.length >= 2,
  });

  // البحث عن منتج بالباركود
  const productLookupMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.get<Product>(`/products/barcode/${code}`);
      return res.data;
    },
    onSuccess: async (product) => {
      // جلب السعر الحالي
      try {
        const priceRes = await api.get<{ finalPrice: number }>(
          `/products/${product.id}/price`,
        );
        addToCart(product, priceRes.data.finalPrice);
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'فشل حساب السعر');
      }
      setBarcode('');
      barcodeRef.current?.focus();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'لم يتم العثور على المنتج');
      setBarcode('');
      barcodeRef.current?.focus();
    },
  });

  const addToCart = (product: Product, price: number) => {
    setCart((c) => {
      const existing = c.find((l) => l.product.id === product.id);
      if (existing) {
        toast.warning(`${product.nameAr ?? product.name} موجود في السلة بالفعل`);
        return c;
      }
      toast.success(`أُضيف: ${product.nameAr ?? product.name}`, {
        description: formatCurrency(price),
      });
      return [
        ...c,
        { product, quantity: 1, unitPrice: price, discountAmount: 0 },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((c) => c.filter((l) => l.product.id !== productId));
  };

  const updateLineDiscount = (productId: string, discount: number) => {
    setCart((c) =>
      c.map((l) =>
        l.product.id === productId
          ? { ...l, discountAmount: discount }
          : l,
      ),
    );
  };

  const onBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    productLookupMutation.mutate(barcode.trim());
  };

  // Totals
  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (acc, l) => acc + (l.unitPrice * l.quantity - l.discountAmount),
      0,
    );
    const totalMaking = 0; // simplification, server will compute
    const vatAmount = 0;
    const total = Math.max(0, subtotal - discountTotal + vatAmount);
    const paidAmount = payments.reduce((acc, p) => acc + p.amount, 0);
    const due = Math.max(0, total - paidAmount);
    const change = Math.max(0, paidAmount - total);
    return { subtotal, vatAmount, total, paidAmount, due, change };
  }, [cart, discountTotal, payments]);

  // إضافة دفعة
  const addPayment = () => {
    const amount = parseFloat(newPaymentAmount);
    if (!amount || amount <= 0) return;
    setPayments((p) => [
      ...p,
      {
        id: `${Date.now()}`,
        method: newPaymentMethod,
        amount,
      },
    ]);
    setNewPaymentAmount('');
  };

  const removePayment = (id: string) => {
    setPayments((p) => p.filter((x) => x.id !== id));
  };

  // إنشاء الفاتورة
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('اختر فرعاً');
      if (cart.length === 0) throw new Error('السلة فارغة');

      const payload: any = {
        branchId,
        customerId: customer?.id,
        customerName: customer?.nameAr ?? customer?.name,
        customerPhone: customer?.phone,
        discountAmount: discountTotal,
        discountReason: discountReason || undefined,
        items: cart.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          discountAmount: l.discountAmount,
          discountReason: l.discountReason,
          overridePrice: l.unitPrice, // نمرر السعر الذي تم حسابه
          notes: l.notes,
        })),
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference,
        })),
      };

      const res = await api.post('/invoices', payload);
      return res.data;
    },
    onSuccess: (invoice: any) => {
      toast.success(`تم إصدار الفاتورة: ${invoice.invoiceNo}`, {
        description: `الإجمالي: ${formatCurrency(invoice.total)}`,
      });
      // مسح السلة
      setCart([]);
      setCustomer(null);
      setPayments([]);
      setDiscountTotal(0);
      setDiscountReason('');
      setShowCheckout(false);
      barcodeRef.current?.focus();
      // التوجيه لصفحة الفاتورة (لاحقاً للطباعة)
      // router.push(`/pos/invoices/${invoice.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err.message ?? 'فشل إصدار الفاتورة';
      toast.error(Array.isArray(msg) ? msg.join('، ') : msg);
    },
  });

  return (
    <AppShell>
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            نقطة البيع (POS)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            امسح الباركود أو ابحث عن المنتج لإضافته للسلة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input text-sm w-48"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr ?? b.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left/Center - Scanner + Cart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode Scanner */}
          <section className="card p-4">
            <form onSubmit={onBarcodeSubmit}>
              <label className="text-xs text-slate-500 mb-1 block">
                مسح الباركود أو إدخال SKU/RFID
              </label>
              <div className="relative">
                <Scan className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500" />
                <input
                  ref={barcodeRef}
                  type="text"
                  className="input pr-10 text-lg font-mono"
                  placeholder="امسح أو اكتب الكود واضغط Enter"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  autoFocus
                  dir="ltr"
                />
              </div>
            </form>
          </section>

          {/* Cart */}
          <section className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                السلة ({cart.length} منتج)
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('مسح السلة بالكامل؟')) setCart([]);
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  مسح الكل
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p>السلة فارغة. ابدأ بمسح الباركود</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map((line) => (
                  <div key={line.product.id} className="p-4 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">
                        {line.product.nameAr ?? line.product.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
                        <span className="font-mono">{line.product.sku}</span>
                        <span>{metalLabel[line.product.metalType]} {karatLabel[line.product.karat]}</span>
                        <span>{formatWeight(line.product.netWeight)}</span>
                      </div>
                      {line.discountAmount > 0 && (
                        <div className="text-xs text-emerald-600 mt-1">
                          خصم: {formatCurrency(line.discountAmount)}
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-800">
                        {formatCurrency(line.unitPrice - line.discountAmount)}
                      </div>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="خصم"
                        className="input text-xs w-24 mt-1 py-1"
                        value={line.discountAmount || ''}
                        onChange={(e) =>
                          updateLineDiscount(
                            line.product.id,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <button
                      onClick={() => removeFromCart(line.product.id)}
                      className="self-start text-red-500 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right - Customer + Totals + Checkout */}
        <div className="space-y-4">
          {/* Customer */}
          <section className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                العميل
              </h3>
              {customer && (
                <button
                  onClick={() => setCustomer(null)}
                  className="text-xs text-red-600"
                >
                  إزالة
                </button>
              )}
            </div>
            {customer ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="font-medium text-slate-800">
                  {customer.nameAr ?? customer.name}
                  {customer.isVip && (
                    <span className="text-xs bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded mr-2">
                      VIP
                    </span>
                  )}
                </div>
                {customer.phone && (
                  <div className="text-xs text-slate-500 mt-1 font-mono" dir="ltr">
                    {customer.phone}
                  </div>
                )}
                <div className="text-xs mt-2 flex gap-3 text-slate-600">
                  <span>نقاط: {customer.loyaltyPoints}</span>
                  {Number(customer.outstandingBalance) > 0 && (
                    <span className="text-red-600">
                      مدين: {formatCurrency(customer.outstandingBalance)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="input pr-9 text-sm"
                  placeholder="ابحث بالاسم أو الهاتف..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerOpen(true);
                  }}
                  onFocus={() => setCustomerOpen(true)}
                />
                {customerOpen && customerResults && customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCustomer(c);
                          setCustomerSearch('');
                          setCustomerOpen(false);
                        }}
                        className="w-full text-right p-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                      >
                        <div className="font-medium">{c.nameAr ?? c.name}</div>
                        {c.phone && (
                          <div className="text-xs text-slate-500 font-mono" dir="ltr">
                            {c.phone}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Totals */}
          <section className="card p-4 bg-gradient-to-br from-gold-50 to-amber-50 border-gold-200">
            <h3 className="text-sm font-bold text-slate-800 mb-3">الإجماليات</h3>
            <div className="space-y-2 text-sm">
              <Row label="المجموع" value={formatCurrency(totals.subtotal)} />
              <div className="flex items-center justify-between">
                <span className="text-slate-600">خصم على الإجمالي</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="input w-24 py-1 text-sm text-left"
                  value={discountTotal || ''}
                  onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="border-t border-gold-300 pt-2 mt-2">
                <Row label="المطلوب" value={formatCurrency(totals.total)} bold large />
              </div>
              {totals.paidAmount > 0 && (
                <>
                  <Row label="المدفوع" value={formatCurrency(totals.paidAmount)} />
                  {totals.due > 0 && (
                    <Row label="المتبقي" value={formatCurrency(totals.due)} className="text-red-600" />
                  )}
                  {totals.change > 0 && (
                    <Row
                      label="الباقي للعميل"
                      value={formatCurrency(totals.change)}
                      className="text-emerald-600"
                    />
                  )}
                </>
              )}
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              className="btn-gold w-full mt-4 text-base disabled:opacity-50"
            >
              تحاسب
            </button>
          </section>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold">التحاسب</h2>
              <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded p-3">
                  <div className="text-xs text-slate-500">المطلوب</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {formatCurrency(totals.total)}
                  </div>
                </div>
                <div className="bg-emerald-50 rounded p-3">
                  <div className="text-xs text-slate-500">المدفوع</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {formatCurrency(totals.paidAmount)}
                  </div>
                </div>
              </div>

              {/* Payments list */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {paymentMethodIcons[p.method]}
                        <span>{paymentMethodLabels[p.method]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatCurrency(p.amount)}</span>
                        <button onClick={() => removePayment(p.id)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add payment */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-2">إضافة دفعة</div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="input text-sm"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    {Object.entries(paymentMethodLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="المبلغ"
                    className="input text-sm"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                  />
                  <button onClick={addPayment} className="btn-secondary text-sm">
                    إضافة
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setNewPaymentAmount(totals.due.toFixed(3))}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    دفع المتبقي ({formatCurrency(totals.due)})
                  </button>
                </div>
              </div>

              {totals.change > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-center">
                  <div className="text-xs text-slate-600">الباقي للعميل</div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(totals.change)}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowCheckout(false)}
                className="btn-secondary"
              >
                رجوع
              </button>
              <button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={createInvoiceMutation.isPending}
                className="btn-gold disabled:opacity-60 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {createInvoiceMutation.isPending ? 'جاري الإصدار...' : 'إصدار الفاتورة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({
  label,
  value,
  bold,
  large,
  className = '',
}: {
  label: string;
  value: string;
  bold?: boolean;
  large?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className={bold ? 'font-bold text-slate-800' : 'text-slate-600'}>
        {label}
      </span>
      <span className={[bold && 'font-bold text-slate-800', large && 'text-xl'].filter(Boolean).join(' ')}>
        {value}
      </span>
    </div>
  );
}
