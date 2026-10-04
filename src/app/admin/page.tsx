import Link from "next/link";

import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  buttonClassName,
} from "@/components/ui";
import { prisma } from "@/server/database/prisma";

export default async function AdminOverviewPage() {
  const [pending, active, suspended, plans, categories] = await Promise.all([
    prisma.shop.count({ where: { status: "PENDING" } }),
    prisma.shop.count({ where: { status: "ACTIVE" } }),
    prisma.shop.count({ where: { status: "SUSPENDED" } }),
    prisma.plan.count(),
    prisma.businessCategory.count(),
  ]);

  const cards = [
    { label: "Pending shops", value: pending, href: "/admin/shops", description: "Awaiting review" },
    { label: "Active shops", value: active, href: "/admin/shops", description: "Publicly active" },
    { label: "Suspended shops", value: suspended, href: "/admin/shops", description: "Require attention" },
    { label: "Plans", value: plans, href: "/admin/plans", description: "Database-driven plans" },
    { label: "Business categories", value: categories, href: "/admin/categories", description: "Global catalogue verticals" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 6"
        title="Platform administration"
        description="Review shops, plans, categories and platform-level catalogue activity from one protected workspace."
      />
      <Alert title="Server-side administration">
        Admin mutations use the existing platform-admin APIs and server-side authorization. Browser state is never treated as the security boundary.
      </Alert>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle>{card.label}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{card.value}</p>
              <Link href={card.href} className={buttonClassName("secondary", "sm", "mt-4")}>Open</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
