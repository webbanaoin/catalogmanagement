import {
  Badge,
  PageHeader,
} from "@/components/ui";
import { ShopProfileForm } from "@/components/shop-management/shop-profile-form";
import { ShopHoursManager } from "@/components/shop-management/shop-hours-manager";

export default function ShopProfilePage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Shop profile"
        description="Manage the customer-facing shop identity, branding, contact details, location, opening hours and catalogue settings."
        actions={<Badge variant="success">Ready</Badge>}
      />

      <ShopProfileForm />
      <ShopHoursManager />
    </div>
  );
}
