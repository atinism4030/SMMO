import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function CalendarPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
