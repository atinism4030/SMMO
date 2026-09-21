import { dictionaries, type Locale, type TranslationDictionary } from './translations';

export { locales, LOCALE_LABELS, dictionaries } from './translations';
export type { Locale, TranslationDictionary } from './translations';

type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : DotPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every valid translation key, e.g. "common.save" | "dashboard.welcome" | ... */
export type TranslationKey = DotPaths<TranslationDictionary>;

function lookup(dict: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/**
 * Resolves a translation key for `locale`, falling back to English if the
 * key is missing from that locale's dictionary, and to the raw key itself
 * (never a blank string) if it's missing everywhere — a visible "unwired"
 * key in development is far easier to catch than silent empty UI.
 */
export function translate(locale: Locale, key: TranslationKey, vars?: Record<string, string | number>): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(dictionaries.en, key) ?? key;
  return interpolate(raw, vars);
}
