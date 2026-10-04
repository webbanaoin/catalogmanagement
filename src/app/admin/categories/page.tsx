import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { requirePlatformAdmin } from "@/server/auth/admin-access";
import { prisma } from "@/server/database/prisma";

export default async function AdminBusinessCategoriesPage() {
  await requirePlatformAdmin();
  const categories = await prisma.businessCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Business categories"
        description="Inspect the global verticals available to merchant shops."
      />
      <Alert title="Read-only in the current API contract">
        The repository currently exposes category reads but no platform-admin create/update/delete endpoint for global business categories. This screen intentionally does not invent unsupported mutations.
      </Alert>
      {categories.length === 0 ? (
        <EmptyState title="No business categories configured" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.slug}</CardDescription>
                  </div>
                  <Badge variant={category.status === "ACTIVE" ? "info" : "neutral"}>{category.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">Display order: {category.displayOrder}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
