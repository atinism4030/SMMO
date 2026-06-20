import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function MyTasksPage() {
  return <AppLayout requiredRole="WORKER"><Content /></AppLayout>;
}
