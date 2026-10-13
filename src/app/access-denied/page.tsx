import Link from "next/link";

import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  buttonClassName,
} from "@/components/ui";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const area = Array.isArray(params.area) ? params.area[0] : params.area;
  const adminArea = area === "admin";

  return (
    <main className="min-h-screen bg-background py-10 sm:py-16">
      <Container className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">Access denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert variant="warning">
              {adminArea
                ? "This account does not have platform administrator access."
                : "This account does not have permission to open this area."}
            </Alert>
            <p className="text-sm leading-6 text-muted">
              Your current session is still active. You can continue using the areas available to this account.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className={buttonClassName("primary")}>
                Back to merchant dashboard
              </Link>
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
