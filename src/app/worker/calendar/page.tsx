import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function WorkerCalendarPage() {
  return <AppLayout requiredRole="WORKER"><Content /></AppLayout>;
}
