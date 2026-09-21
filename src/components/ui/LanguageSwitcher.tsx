'use client';

import { useTranslation } from '@/components/providers/LanguageProvider';
import { locales, LOCALE_LABELS } from '@/lib/i18n';
import { Languages } from 'lucide-react';

/** A small EN/SQ toggle. Placed in the Sidebar footer so it's reachable from every page. */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useTranslation();

  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: '#1a1a1a' }}>
        {locales.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className="px-2 py-1 rounded-md text-xs font-medium transition-colors"
            style={{
              background: locale === l ? '#ffffff' : 'transparent',
              color: locale === l ? '#000000' : '#71717a',
            }}
            aria-pressed={locale === l}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Languages size={14} style={{ color: 'var(--text-muted)' }} />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="px-2 py-1.5 rounded-lg text-sm border cursor-pointer"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        aria-label="Language"
      >
        {locales.map((l) => (
          <option key={l} value={l} style={{ background: 'var(--bg-card)' }}>{LOCALE_LABELS[l]}</option>
        ))}
      </select>
    </div>
  );
}
