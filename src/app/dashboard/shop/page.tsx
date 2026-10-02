import {
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
        description="Manage the customer-facing shop identity, contact details, location and business category."
        actions={<Badge variant="success">API connected</Badge>}
      />

      <ShopProfileForm />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logo and cover</CardTitle>
            <CardDescription>Media upload is intentionally reserved for the authorized S3 workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted">
              Sprint 2 stores media metadata safely, while browser uploads will use presigned URLs without exposing AWS credentials.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opening hours</CardTitle>
            <CardDescription>The tenant-safe hours API is available for the next UI connection step.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted">
              Opening hours remain separate from profile details so merchants can manage closed days and daily timings independently.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
