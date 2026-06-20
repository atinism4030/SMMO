import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AppLayout><Content params={params} /></AppLayout>;
}
