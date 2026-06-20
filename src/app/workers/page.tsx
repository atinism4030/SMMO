import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function WorkersPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
