import { EmptyState } from '@/components/ui/empty-state';

export default function MapScreen() {
  return (
    <EmptyState
      sf="location.fill"
      md="location-on"
      title="Map coming soon"
      description="This is where you will browse shops around you."
    />
  );
}
