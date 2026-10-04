import { AdminShopManager } from "@/components/admin/admin-shop-manager";
import { PageHeader } from "@/components/ui";

export default function AdminShopsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Shop lifecycle"
        description="Review pending, approved, active, suspended and rejected shops and inspect their subscription state."
      />
      <AdminShopManager />
    </div>
  );
}
