import Link from "next/link";

import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  buttonClassName,
} from "@/components/ui";

const workspaces = [
  {
    title: "Shop profile",
    description: "Review the Sprint 2 profile fields and India-only validation without pretending that persistence exists.",
    href: "/dashboard/shop",
    status: "Sprint 2",
  },
  {
    title: "Categories",
    description: "Use the contract-safe category workspace while tenant-safe CRUD endpoints are finalized.",
    href: "/dashboard/categories",
    status: "Sprint 2",
  },
  {
    title: "Products",
    description: "Full merchant product management remains outside Parixit's current Sprint 2 UI ownership.",
    status: "Later sprint",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 2"
        title="Merchant dashboard"
        description="Shop-management UI now builds on the Sprint 1 authentication and tenant foundation without inventing catalogue API contracts."
      />

      <Alert title="Contract-first merchant UI">
        Shop-profile persistence and category CRUD will connect only to tenant-safe server APIs. Until those contracts exist, the UI exposes validation and integration boundaries rather than fake merchant data.
      </Alert>

      <section aria-labelledby="merchant-workspaces-heading">
        <h2 id="merchant-workspaces-heading" className="sr-only">
          Merchant workspaces
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{workspace.title}</CardTitle>
                  <Badge variant={workspace.status === "Sprint 2" ? "info" : "neutral"}>
                    {workspace.status}
                  </Badge>
                </div>
                <CardDescription>{workspace.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                {workspace.href ? (
                  <Link href={workspace.href} className={buttonClassName("secondary", "sm")}>
                    Open workspace
                  </Link>
                ) : (
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                    Reserved for later sprint
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
