'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { setToken, setUser, isAuthenticated, type AuthenticatedUser } from '@/lib/auth';

interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(from);
    }
  }, [from, router]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<LoginResponse>('/auth/login', {
        email: email.toLowerCase().trim(),
        password,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setToken(data.accessToken);
      setUser(data.user);
      toast.success(`مرحباً ${data.user.nameAr ?? data.user.name}`);
      router.push(from);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err.message ?? 'فشل تسجيل الدخول';
      toast.error(Array.isArray(msg) ? msg.join('، ') : msg);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-amber-50 to-gold-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-3xl font-bold mb-4 shadow-lg">
            ج
          </div>
          <h1 className="text-2xl font-bold text-slate-800">JawharaERP</h1>
          <p className="text-sm text-slate-500 mt-1">نظام إدارة محلات المجوهرات</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">تسجيل الدخول</h2>
          <p className="text-sm text-slate-500 mb-6">ادخل بياناتك للوصول إلى لوحة التحكم</p>

          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  className="input pr-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="email"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input pr-9 pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              {mutation.isPending ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-2">حسابات تجريبية:</div>
            <div className="text-[11px] space-y-1 text-slate-600 font-mono">
              <div>👑 abdullah-aljahwari@outlook.com / Owner@2026</div>
              <div>🏪 owner@jawhara-demo.com / Owner@2026</div>
              <div>👔 manager@jawhara-demo.com / Manager@2026</div>
              <div>💼 sales@jawhara-demo.com / Sales@2026</div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">الإصدار 0.2.0 — Multi-Tenant</p>
      </div>
    </div>
  );
}
