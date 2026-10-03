import qrcode from "qrcode-generator";

import { ShopQrCard } from "@/components/dashboard/shop-qr-card";
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  PageHeader,
} from "@/components/ui";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getAppEnvironment } from "@/server/env";

export const dynamic = "force-dynamic";

function permanentQrUrl(shopSlug: string): string {
  const url = new URL(`/s/${shopSlug}`, getAppEnvironment().APP_URL);
  url.searchParams.set("src", "qr");
  return url.toString();
}

function qrSvg(value: string): string {
  const code = qrcode(0, "M");
  code.addData(value);
  code.make();
  return code.createSvgTag({ cellSize: 8, margin: 32, scalable: true });
}

export default async function ShopQrPage() {
  const user = await requireCurrentUser();
  const activeShop = user.shops.find((shop) => shop.status === "ACTIVE");
  const approvedShop = user.shops.find((shop) => shop.status === "APPROVED");

  if (!activeShop) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sprint 4"
          title="Shop QR"
          description="Create and share the permanent QR for your public Digital Showroom."
        />
        <ErrorState
          title="Public catalogue is not active yet"
          description={
            approvedShop
              ? "This shop is approved but is not ACTIVE yet. The permanent QR becomes usable when the public catalogue is active."
              : "No active merchant shop is available for this account."
          }
        />
      </div>
    );
  }

  const publicUrl = permanentQrUrl(activeShop.slug);
  const svg = qrSvg(publicUrl);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 4"
        title="Permanent shop QR"
        description={`Share ${activeShop.name}'s Digital Showroom with one permanent QR.`}
      />

      <Alert title="QR source tracking">
        This QR opens the permanent shop route with <code>src=qr</code>. Sprint 4 analytics can attribute catalogue visits to QR scans without exposing private merchant identifiers.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{activeShop.name}</CardTitle>
          <CardDescription>
            Copy the public link, download the QR as SVG, share it from a supported device, or open a simple print view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShopQrCard shopName={activeShop.name} publicUrl={publicUrl} qrSvg={svg} />
        </CardContent>
      </Card>
    </div>
  );
}
