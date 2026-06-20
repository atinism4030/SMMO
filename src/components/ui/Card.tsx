import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  onClick?: () => void;
  hoverable?: boolean;
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export default function Card({ children, className, padding = 'md', onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border',
        paddingMap[padding],
        hoverable && 'cursor-pointer transition-all duration-150',
        className
      )}
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        ...(hoverable ? {} : {}),
      }}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconColor?: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export function StatCard({ label, value, icon: Icon, iconColor, subtitle }: StatCardProps) {
  return (
    <Card className="hover:border-indigo-500/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg ml-3" style={{ background: 'var(--bg-elevated)' }}>
            <Icon size={18} className={iconColor ?? 'text-indigo-400'} />
          </div>
        )}
      </div>
    </Card>
  );
}
