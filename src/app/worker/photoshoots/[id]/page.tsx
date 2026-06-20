import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function WorkerPhotoshootDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AppLayout requiredRole="WORKER"><Content params={params} /></AppLayout>;
}
