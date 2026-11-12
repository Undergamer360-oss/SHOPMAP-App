import { EmptyState } from '@/components/ui/empty-state';

export default function HomeScreen() {
  return (
    <EmptyState
      sf="map.fill"
      md="map"
      title="Your map is empty"
      description="Nearby shops and the places you save will show up here."
    />
  );
}
