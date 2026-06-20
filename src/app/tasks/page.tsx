import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function TasksPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
