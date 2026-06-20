import AppLayout from '@/components/layout/AppLayout';
import Content from '@/app/settings/Content';

export default function WorkerSettingsPage() {
  return <AppLayout requiredRole="WORKER"><Content /></AppLayout>;
}
