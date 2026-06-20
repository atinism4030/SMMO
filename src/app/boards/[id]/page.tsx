import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AppLayout requiredRole="CEO"><Content params={params} /></AppLayout>;
}
