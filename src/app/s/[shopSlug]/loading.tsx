import {
  StorefrontContentSkeleton,
  StorefrontHeroSkeleton,
  StorefrontSection,
  StorefrontShell,
} from "@/components/storefront/storefront-shell";

export default function StorefrontLoading() {
  return (
    <StorefrontShell>
      <StorefrontHeroSkeleton />
      <StorefrontSection title="Loading catalogue">
        <StorefrontContentSkeleton />
      </StorefrontSection>
    </StorefrontShell>
  );
}
