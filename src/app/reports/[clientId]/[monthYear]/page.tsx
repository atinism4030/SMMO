import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function MonthBoardsPage({
  params,
}: {
  params: Promise<{ clientId: string; monthYear: string }>;
}) {
  return <AppLayout requiredRole="CEO"><Content params={params} /></AppLayout>;
}
