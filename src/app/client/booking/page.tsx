import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function ClientBookingPage() {
  return <AppLayout requiredRole="CLIENT"><Content /></AppLayout>;
}
