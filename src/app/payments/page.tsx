import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function PaymentsPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
