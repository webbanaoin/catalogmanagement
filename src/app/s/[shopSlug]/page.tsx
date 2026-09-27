import { Alert } from "@/components/ui";
import {
  StorefrontContentSkeleton,
  StorefrontHeroSkeleton,
  StorefrontSection,
  StorefrontShell,
} from "@/components/storefront/storefront-shell";

export default function StorefrontPage() {
  return (
    <StorefrontShell>
      <StorefrontHeroSkeleton />
      <StorefrontSection
        title="Catalogue layout foundation"
        description="Search, categories and product collections will be connected when storefront data contracts are implemented."
      >
        <Alert>
          This route intentionally renders presentation scaffolding only; it does not invent shop, product or API data.
        </Alert>
        <div className="mt-6">
          <StorefrontContentSkeleton />
        </div>
      </StorefrontSection>
    </StorefrontShell>
  );
}
