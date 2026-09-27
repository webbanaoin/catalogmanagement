import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader } from "@/components/ui";

const foundationAreas = [
  {
    title: "Catalogue workspace",
    description: "The shell is ready for products, categories and quick catalogue actions once their contracts exist.",
  },
  {
    title: "Customer actions",
    description: "Analytics cards can be added later for WhatsApp, call and directions events without changing the page shell.",
  },
  {
    title: "Storefront controls",
    description: "QR, shop profile and subscription areas have reserved navigation positions for their owning sprints.",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 0"
        title="Merchant dashboard foundation"
        description="A mobile-first shell for future catalogue management. No authentication, tenant data or business APIs are simulated here."
      />

      <Alert title="Foundation boundary">
        Authentication, merchant data and backend contracts intentionally remain outside this Sprint 0 UI work.
      </Alert>

      <section aria-labelledby="foundation-areas-heading">
        <h2 id="foundation-areas-heading" className="sr-only">
          Dashboard foundation areas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {foundationAreas.map((area) => (
            <Card key={area.title}>
              <CardHeader>
                <CardTitle>{area.title}</CardTitle>
                <CardDescription>{area.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Ready for later sprint</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <EmptyState
        title="No merchant data is loaded"
        description="This state is intentional in Sprint 0. Future feature screens can reuse the same empty, loading, error and success patterns."
      />
    </div>
  );
}
