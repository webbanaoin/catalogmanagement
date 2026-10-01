import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";

const contractGates = [
  "List endpoint and collection response shape",
  "Create and edit payloads",
  "Validation limits and duplicate/conflict behavior",
  "Parent-category hierarchy rules",
  "Display-order mutation behavior",
  "Status or visibility transitions",
  "Tenant authorization and cross-shop rejection behavior",
];

const plannedStates = [
  "Loading and initial fetch",
  "No-category empty state",
  "Create and edit validation",
  "Mutation submitting/success/error feedback",
  "Conflict and forbidden responses",
  "Mobile-friendly category rows or cards",
];

export default function CategoriesPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 2"
        title="Shop categories"
        description="Merchant category-management workspace reserved for data-driven, tenant-safe catalogue categories."
        actions={<Badge variant="info">Awaiting API contract</Badge>}
      />

      <Alert variant="warning" title="Category API is not frozen yet">
        Prashant's current Sprint 2 branch does not expose shop-category CRUD contracts beyond the existing staging baseline. This page therefore avoids fake categories, fake persistence, and invented request shapes.
      </Alert>

      <EmptyState
        title="Category management is ready for integration"
        description="No sample categories are fabricated. Once the tenant-safe API contract is available, this screen can connect list, create and edit states without replacing the dashboard structure."
        action={<Button disabled>Add category — API pending</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contract gates</CardTitle>
            <CardDescription>These details must be agreed before the UI sends category requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {contractGates.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planned merchant states</CardTitle>
            <CardDescription>The UI structure is designed to use the existing shared feedback primitives.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {plannedStates.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert title="Model boundary">
        Business categories are platform-level verticals; shop categories are merchant catalogue categories. This UI will not hard-code jewellery, clothing, toys, furniture or footwear logic into reusable category behavior.
      </Alert>
    </div>
  );
}
