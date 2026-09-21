'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ContentTypeBadge, PlatformBadge } from '@/components/ui/Badge';
import type { IContentItem } from '@/types';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from '@/components/providers/LanguageProvider';

function monthLabel(d: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
}

function dayLabel(d: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}

export default function ClientContentContent() {
  const { t } = useTranslation();
  const [items, setItems] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/content');
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { load(); }, [load]);

  // Only content that's actually scheduled belongs on a calendar — undated
  // ideas still in planning aren't shown here to keep this view simple.
  const scheduled = items
    .filter((i) => i.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());

  const groups = new Map<string, IContentItem[]>();
  for (const item of scheduled) {
    const key = monthLabel(new Date(item.scheduledDate!));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <>
      <Topbar title={t('nav.contentCalendar')} subtitle={t('clientPortal.contentCalendarSubtitle')} />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <LoadingSpinner fullPage /> : scheduled.length === 0 ? (
          <EmptyState title={t('clientPortal.noContentScheduled')} description={t('clientPortal.noContentScheduledDesc')} icon={CalendarDays} />
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            {Array.from(groups.entries()).map(([month, monthItems]) => (
              <div key={month}>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 pb-2 border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  {month}
                </h3>
                <div className="space-y-2">
                  {monthItems.map((item) => (
                    <div key={item._id} className="flex items-center gap-4 p-3.5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <div className="w-14 flex-shrink-0 text-center">
                        <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                          {new Date(item.scheduledDate!).getDate()}
                        </p>
                        <p className="text-[10px] mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>
                          {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(item.scheduledDate!))}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{dayLabel(new Date(item.scheduledDate!))}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.platforms?.slice(0, 2).map((p) => <PlatformBadge key={p} platform={p} />)}
                        <ContentTypeBadge type={item.contentType} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
