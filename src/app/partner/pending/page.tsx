import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Container } from "@/components/ui";

export default function PartnerPendingPage() {
  return (
    <main className="min-h-screen bg-background py-12">
      <Container>
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Partner approval pending</CardTitle>
            <CardDescription>
              Webbanao will review your marketing partner registration before activating referrals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted">
            <p>
              Once approved, a unique referral code will be generated automatically.
              You can then sign in to see your referral link, referred shops, earned commission,
              pending payouts and payment history.
            </p>
            <Link
              href="/partner/login"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0f766e] px-4 font-semibold !text-white shadow-sm transition hover:bg-[#115e59]"
            >
              Back to partner sign in
            </Link>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
