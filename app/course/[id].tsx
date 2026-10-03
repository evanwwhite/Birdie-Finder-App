import { useLocalSearchParams } from 'expo-router';
import { PublicCourseDetail } from '@/components/PublicCatalog';
export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublicCourseDetail id={String(id)} />;
}
