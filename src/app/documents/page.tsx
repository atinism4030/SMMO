import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function DocumentsPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
