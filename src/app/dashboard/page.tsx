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
    description: "Manage the catalogue and product media through the Sprint 3 merchant workflow.",
    status: "Sprint 3",
  },
  {
    title: "QR & sharing",
    description: "Open the permanent shop QR workspace to copy, download, print or share the public catalogue link.",
    href: "/dashboard/qr",
    status: "Sprint 4",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 4"
        title="Merchant dashboard"
        description="Manage the shop catalogue and sharing surfaces built through Sprints 1–4."
      />

      <Alert title="Permanent public catalogue">
        Your shop slug remains the stable public catalogue route. Sprint 4 adds a permanent QR and sharing workspace without exposing tenant IDs or environment-specific secrets.
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
                  <Badge variant={workspace.status.startsWith("Sprint") ? "info" : "neutral"}>
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
