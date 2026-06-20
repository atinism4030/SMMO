import AppLayout from '@/components/layout/AppLayout';
import Content from './Content';

export default function PhotoshootsPage() {
  return <AppLayout requiredRole="CEO"><Content /></AppLayout>;
}
