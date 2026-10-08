import { AdminBusinessCategoryManager } from "@/components/admin/admin-business-category-manager";
import { AdminStorefrontDefaults } from "@/components/admin/admin-storefront-defaults";
import { PageHeader } from "@/components/ui";
import { requirePlatformAdminPageAccess } from "@/server/auth/admin-page-access";

export default async function AdminBusinessCategoriesPage() {
  await requirePlatformAdminPageAccess();

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Business categories"
        description="Create, order and activate merchant verticals, and manage shared category images inherited by matching storefronts."
      />
      <AdminStorefrontDefaults />
      <AdminBusinessCategoryManager />
    </div>
  );
}
