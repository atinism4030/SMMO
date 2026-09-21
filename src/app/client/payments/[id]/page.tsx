import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default async function ClientPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppLayout requiredRole="CLIENT"><Content paymentId={id} /></AppLayout>;
}
