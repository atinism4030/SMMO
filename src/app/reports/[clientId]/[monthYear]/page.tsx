import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function MonthlyReportPage({
  params,
}: {
  params: Promise<{ clientId: string; monthYear: string }>;
}) {
  return <AppLayout requiredRole={["CEO","WORKER"]}><Content params={params} /></AppLayout>;
}
