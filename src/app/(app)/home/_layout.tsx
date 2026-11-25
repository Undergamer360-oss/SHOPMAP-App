import { TabStack } from '@/components/tab-stack';

export default function HomeLayout() {
  // Home draws its own SHOPMAP DEMO heading, so the stack header is hidden.
  return <TabStack title="Home" hideHeader />;
}
