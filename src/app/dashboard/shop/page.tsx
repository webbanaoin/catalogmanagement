import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui";
import { ShopProfileForm } from "@/components/shop-management/shop-profile-form";

export default function ShopProfilePage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 2"
        title="Shop profile"
        description="Mobile-first profile management presentation for the merchant dashboard, reusing the approved India-only validation rules."
        actions={<Badge variant="info">Contract-safe UI</Badge>}
      />

      <Alert variant="warning" title="Persistence contract pending">
        The current branch has no frozen tenant-safe shop-profile read/update API. This screen validates the agreed fields locally but deliberately does not fetch, save, or invent merchant data.
      </Alert>

      <Alert title="Authorization boundary">
        This dashboard route is not proof of shop access. When profile APIs arrive, every read and mutation must verify the authenticated user's shop membership on the server.
      </Alert>

      <ShopProfileForm />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logo and cover</CardTitle>
            <CardDescription>Media belongs behind the authorized S3 upload contract.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted">
              Upload controls are intentionally deferred. The frontend will never receive AWS credentials or persist hard-coded public S3 URLs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opening hours</CardTitle>
            <CardDescription>Sprint 1 already established the paired-time UX.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted">
              Persistence will connect only after the Sprint 2 shop-hours API defines day, closed-state and time serialization. Overnight hours must remain representable unless the contract says otherwise.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
