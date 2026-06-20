import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function WorkerPhotoshootsPage() {
  return <AppLayout requiredRole="WORKER"><Content /></AppLayout>;
}
