'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3, Building2, ChevronRight, CheckCircle2, AlertTriangle, FileText, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClientSummary {
  _id: string;
  name: string;
  status: string;
  businessType?: string;
  totalBoards: number;
  totalPosted: number;
  completedInsights: number;
  missingInsights: number;
  progress: number;
}

export default function ReportsContent() {
  const [summary, setSummary] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/reports/summary')
      .then(r => r.json())
      .then(d => { setSummary(d.summary ?? []); setLoading(false); });
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <>
      <Topbar
        title="Reports"
        subtitle="Click a client to view monthly performance boards and generate PDF reports"
      />
      <div className="flex-1 overflow-y-auto p-6">
        {summary.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Add clients and create boards to start generating performance reports"
            icon={BarChart3}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.map(client => (
              <ClientCard
                key={client._id}
                client={client}
                onClick={() => router.push(`/reports/${client._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ClientCard({ client, onClick }: { client: ClientSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border p-5 transition-all hover:border-zinc-600 hover:-translate-y-0.5 active:translate-y-0"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#222222' }}>
          <Building2 size={18} className="text-white" />
        </div>
        <ChevronRight size={16} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
      </div>

      <p className="text-base font-bold mb-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
        {client.name}
      </p>
      {client.businessType && (
        <p className="text-xs mb-4 truncate" style={{ color: 'var(--text-muted)' }}>{client.businessType}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <MiniStat icon={Layers}        label="Boards"    value={client.totalBoards} />
        <MiniStat icon={FileText}      label="Published" value={client.totalPosted} />
        <MiniStat icon={CheckCircle2}  label="Insights"  value={client.completedInsights} color="text-zinc-400" />
        <MiniStat icon={AlertTriangle} label="Missing"   value={client.missingInsights}
          color="text-zinc-400" />
      </div>

      {client.totalPosted > 0 ? (
        <>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Insight completion</span>
            <span className="text-xs font-bold"
              style={{ color: 'var(--text-primary)' }}>
              {client.progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-1.5 rounded-full transition-all" style={{
              width: `${client.progress}%`,
              background: '#ffffff',
            }} />
          </div>
        </>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No published content yet</p>
      )}
    </button>
  );
}

function MiniStat({ icon: Icon, label, value, color = 'text-slate-400' }: {
  icon: React.ElementType; label: string; value: number; color?: string;
}) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={10} className={color} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
