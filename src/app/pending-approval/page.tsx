import Link from "next/link";

import { MerchantLogoutButton } from "@/components/auth/merchant-logout-button";

import { Alert, Badge, buttonClassName, Card, CardContent, CardHeader, CardTitle, Container } from "@/components/ui";

export default function PendingApprovalPage() {
  return (
    <main className="min-h-screen bg-background py-10 sm:py-16">
      <Container className="max-w-2xl">
        <Card>
          <CardHeader>
            <Badge variant="warning" className="w-fit">
              Pending review
            </Badge>
            <CardTitle className="mt-3 text-2xl sm:text-3xl">Your registration has been received</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted sm:text-base">
              Your shop is awaiting administrator review. Merchant access becomes available after the shop is approved according to the platform workflow.
            </p>
            <Alert>
              No approval time is promised here. This screen intentionally avoids inventing an SLA that is not defined in the product requirements.
            </Alert>
            <div className="flex flex-col gap-3 sm:flex-row">
              <MerchantLogoutButton
                className="w-full sm:w-auto"
                label="Sign out"
              />
              <Link href="/" className={buttonClassName("secondary")}>
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
