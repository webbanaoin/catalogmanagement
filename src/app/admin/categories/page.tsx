import { AdminBusinessCategoryManager } from "@/components/admin/admin-business-category-manager";
import { PageHeader } from "@/components/ui";
import { requirePlatformAdmin } from "@/server/auth/admin-access";

export default async function AdminBusinessCategoriesPage() {
  await requirePlatformAdmin();

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Business categories"
        description="Create, order and activate the global verticals available to merchant shops."
      />
      <AdminBusinessCategoryManager />
    </div>
  );
}
