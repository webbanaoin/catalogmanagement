import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShopProductImport } from "@/components/admin/admin-shop-product-import";
import {
  Alert,
  Badge,
  PageHeader,
  buttonClassName,
} from "@/components/ui";
import { requirePlatformAdminPageAccess } from "@/server/auth/admin-page-access";
import { prisma } from "@/server/database/prisma";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AdminShopOnboardingPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  await requirePlatformAdminPageAccess();
  const { shopId } = await params;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      requestedBusinessType: true,
      businessCategory: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      _count: {
        select: {
          categories: true,
          products: true,
          importJobs: true,
        },
      },
    },
  });

  if (!shop) notFound();

  const unresolvedBusinessType =
    Boolean(shop.requestedBusinessType) && !shop.businessCategory;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          eyebrow="Admin assisted onboarding"
          title={shop.name}
          description="Prepare and import the merchant's initial product catalogue without using the merchant password."
        />
        <Link
          href="/admin/shops"
          className={buttonClassName("secondary", "sm")}
        >
          Back to shops
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="info">{titleCase(shop.status)}</Badge>
        <Badge variant="neutral">
          {shop.businessCategory?.name ??
            (shop.requestedBusinessType
              ? `Requested: ${shop.requestedBusinessType}`
              : "Generic business type")}
        </Badge>
        <Badge variant="neutral">{shop._count.products} products</Badge>
        <Badge variant="neutral">{shop._count.categories} categories</Badge>
      </div>

      {unresolvedBusinessType ? (
        <Alert variant="warning" title="Business type request must be reviewed first">
          This shop requested “{shop.requestedBusinessType}”. Assign a supported
          business type from the Shops page before generating the Smart Excel,
          so the correct categories and product fields are used.
        </Alert>
      ) : (
        <AdminShopProductImport shopId={shop.id} shopName={shop.name} />
      )}
    </div>
  );
}
