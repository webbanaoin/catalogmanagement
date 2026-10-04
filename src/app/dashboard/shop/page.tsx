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
        eyebrow="Sprint 6"
        title="Shop profile"
        description="Manage the customer-facing shop identity, branding, contact details, location and catalogue settings."
        actions={<Badge variant="success">Ready</Badge>}
      />

      <ShopProfileForm />

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
  );
}
