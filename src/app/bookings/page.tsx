import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function BookingsPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
