'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useTranslation } from '@/components/providers/LanguageProvider';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t('auth.loginFailed')); return; }

      // Honor a deep link the proxy redirected here from (e.g. a payment
      // verification link opened while logged out) so the user lands back on
      // the exact page they were trying to reach — not just their dashboard.
      const redirectTo = searchParams.get('redirect');
      const rolePrefix = data.user.role === 'CEO' ? null : data.user.role === 'CLIENT' ? '/client/' : '/worker/';
      if (redirectTo && (rolePrefix === null || redirectTo.startsWith(rolePrefix))) {
        router.push(redirectTo);
      } else if (data.user.role === 'CEO') {
        router.push('/dashboard');
      } else if (data.user.role === 'CLIENT') {
        router.push('/client/dashboard');
      } else {
        router.push('/worker/dashboard');
      }
    } catch {
      setError(t('auth.networkError'));
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full py-2.5 rounded-lg text-sm border border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-white/10 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher compact />
      </div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-black font-bold text-2xl mb-4 shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold mb-1 text-white">SMMO</h1>
          <p className="text-sm text-zinc-600">{t('auth.tagline')}</p>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-8">
          <h2 className="text-base font-semibold mb-6 text-white">{t('auth.signIn')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">{t('common.email')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')} required
                  className={`${inputClass} pl-9 pr-4`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">{t('common.password')}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className={`${inputClass} pl-9 pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2.5 text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
