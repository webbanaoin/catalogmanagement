import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Alert, Container, PageHeader } from "@/components/ui";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background py-8 sm:py-12">
      <Container>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Sprint 1"
            title="Set up your Digital Showroom"
            description="Complete the merchant onboarding experience. This route does not treat frontend state as an authorization boundary."
          />

          <Alert variant="warning" title="Integration boundary">
            Authentication and shop-profile persistence remain server responsibilities. The auth forms target Prashant&apos;s current API shapes through an isolated client adapter, while this wizard keeps profile data in the browser only for the current UI sprint.
          </Alert>

          <OnboardingWizard />
        </div>
      </Container>
    </main>
  );
}
