import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function ClientReportPage({ params }: { params: Promise<{ clientId: string }> }) {
  return <AppLayout requiredRole={["CEO","WORKER"]}><Content params={params} /></AppLayout>;
}
