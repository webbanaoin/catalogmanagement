import { AdminBusinessCategoryManager } from "@/components/admin/admin-business-category-manager";
import { AdminStorefrontDefaults } from "@/components/admin/admin-storefront-defaults";
import { PageHeader } from "@/components/ui";
import { requirePlatformAdminPageAccess } from "@/server/auth/admin-page-access";

export default async function AdminBusinessCategoriesPage() {
  await requirePlatformAdminPageAccess();

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Business categories"
        description="Manage business types, editable merchant subcategory defaults, shared category images and storefront covers."
      />
      <AdminStorefrontDefaults />
      <AdminBusinessCategoryManager />
    </div>
  );
}
