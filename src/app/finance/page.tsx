import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function FinancePage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
