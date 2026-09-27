import Link from "next/link";

import { Badge, buttonClassName, Card, CardDescription, CardHeader, CardTitle, Container } from "@/components/ui";

const foundations = [
  {
    title: "Merchant shell",
    description: "Responsive dashboard navigation and content layout without inventing authentication or merchant APIs.",
  },
  {
    title: "Storefront shell",
    description: "SEO-friendly server-rendered presentation scaffolding for the permanent shop route.",
  },
  {
    title: "Shared states",
    description: "Reusable loading, empty, error and success presentation for future feature screens.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="border-b border-border bg-surface">
        <Container className="py-16 sm:py-24">
          <Badge variant="info">Phase 1 foundation</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Your shop&apos;s Digital Showroom.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Sprint 0 establishes the reusable UI foundation for a mobile-first merchant dashboard and public catalogue.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard" className={buttonClassName("primary", "lg")}>
              View dashboard shell
            </Link>
            <a href="#ui-foundation" className={buttonClassName("secondary", "lg")}>
              Explore foundation
            </a>
          </div>
        </Container>
      </section>

      <section id="ui-foundation" className="py-12 sm:py-16">
        <Container>
          <div className="grid gap-4 md:grid-cols-3">
            {foundations.map((foundation) => (
              <Card key={foundation.title}>
                <CardHeader>
                  <CardTitle>{foundation.title}</CardTitle>
                  <CardDescription>{foundation.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted">
            Public storefront shell route: <code className="rounded bg-surface-muted px-1.5 py-1 text-foreground">/s/&#123;shopSlug&#125;</code>
          </p>
        </Container>
      </section>
    </main>
  );
}
