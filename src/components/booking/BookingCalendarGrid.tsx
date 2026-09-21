'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/components/providers/LanguageProvider';

export interface CalendarPill {
  key: string;
  label: string;
  /** Tailwind classes for the pill background/text — callers decide semantics per role. */
  className: string;
}

interface BookingCalendarGridProps {
  month: Date; // any date within the month to display
  onMonthChange: (next: Date) => void;
  pillsByDate: Map<string, CalendarPill[]>; // key: 'YYYY-MM-DD'
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function BookingCalendarGrid({ month, onMonthChange, pillsByDate, selectedDateKey, onSelectDate }: BookingCalendarGridProps) {
  const { t } = useTranslation();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  // Monday-first grid: shift so Monday = 0 ... Sunday = 6.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, monthIndex, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = dateKey(new Date());
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))} className="p-1.5 rounded-lg hover:bg-zinc-900" style={{ color: 'var(--text-secondary)' }}>
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{monthLabel}</p>
        <button onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))} className="p-1.5 rounded-lg hover:bg-zinc-900" style={{ color: 'var(--text-secondary)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[76px] sm:min-h-[92px] border-r border-b last:border-r-0" style={{ borderColor: 'var(--border-subtle)' }} />;
          const key = dateKey(d);
          const pills = pillsByDate.get(key) ?? [];
          const isToday = key === today;
          const isSelected = key === selectedDateKey;
          const isPast = key < today;
          return (
            <button
              key={i}
              onClick={() => onSelectDate(key)}
              className="min-h-[76px] sm:min-h-[92px] p-1.5 sm:p-2 text-left border-r border-b last:border-r-0 transition-colors flex flex-col gap-1"
              style={{
                borderColor: 'var(--border-subtle)',
                background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                opacity: isPast ? 0.5 : 1,
              }}
            >
              <span
                className="text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full"
                style={isToday ? { background: 'var(--text-primary)', color: 'var(--bg-base)' } : { color: 'var(--text-secondary)' }}
              >
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {pills.slice(0, 2).map((p) => (
                  <span key={p.key} className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded truncate ${p.className}`}>{p.label}</span>
                ))}
                {pills.length > 2 && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('bookings.morePills', { count: pills.length - 2 })}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { dateKey };
