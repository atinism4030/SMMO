import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function BoardReportPage({
  params,
}: {
  params: Promise<{ clientId: string; monthYear: string; boardId: string }>;
}) {
  return <AppLayout requiredRole="CEO"><Content params={params} /></AppLayout>;
}
