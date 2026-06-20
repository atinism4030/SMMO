import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function ReportsPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
