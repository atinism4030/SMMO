import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ size = 24, className, fullPage }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={size} className={cn('animate-spin text-zinc-500', className)} />
      </div>
    );
  }
  return <Loader2 size={size} className={cn('animate-spin text-zinc-500', className)} />;
}
