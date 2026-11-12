import { EmptyState } from '@/components/ui/empty-state';

export default function SavedScreen() {
  return (
    <EmptyState
      sf="bookmark.fill"
      md="bookmark"
      title="Nothing saved yet"
      description="Shops you bookmark will be collected here."
    />
  );
}
