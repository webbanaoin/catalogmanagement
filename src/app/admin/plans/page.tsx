import { AdminPlanManager } from "@/components/admin/admin-plan-manager";
import { PageHeader } from "@/components/ui";

export default function AdminPlansPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Plans"
        description="Create and update database-driven plan limits, trials and feature entitlements."
      />
      <AdminPlanManager />
    </div>
  );
}
