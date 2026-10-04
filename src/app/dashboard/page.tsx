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
    description: "Manage the customer-facing shop identity, contact details, location and business category.",
    href: "/dashboard/shop",
  },
  {
    title: "Categories",
    description: "Create and organize tenant-safe catalogue categories for this shop.",
    href: "/dashboard/categories",
  },
  {
    title: "Products",
    description: "Create, edit, duplicate, hide or remove products and upload product images.",
    href: "/dashboard/products",
  },
  {
    title: "Excel import",
    description: "Download the template, validate rows, review errors and confirm bulk product imports.",
    href: "/dashboard/import",
  },
  {
    title: "QR & sharing",
    description: "Open the permanent shop QR workspace to copy, download, print or share the public catalogue link.",
    href: "/dashboard/qr",
  },
  {
    title: "Analytics",
    description: "Review catalogue visits, product views, customer actions, QR traffic and top-performing content.",
    href: "/dashboard/analytics",
  },
  {
    title: "Subscription",
    description: "Review the current plan, validity, product limits, image limits and enabled features.",
    href: "/dashboard/subscription",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Merchant dashboard"
        description="Manage your shop profile, catalogue, products, sharing, analytics and subscription from one workspace."
      />

      <Alert title="Sprint 6 release candidate">
        Core merchant workflows are connected end-to-end. Complete the final Golden Flow validation before promoting this release to staging.
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
                  <Badge variant="success">Ready</Badge>
                </div>
                <CardDescription>{workspace.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link href={workspace.href} className={buttonClassName("secondary", "sm")}>
                  Open workspace
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
