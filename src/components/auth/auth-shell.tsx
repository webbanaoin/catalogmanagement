import Link from "next/link";
import type { ReactNode } from "react";

import { Card, Container } from "@/components/ui";

export interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background py-8 sm:py-12">
      <Container className="max-w-xl">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex rounded-lg text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Digital Showroom
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted sm:text-base">
            {description}
          </p>
        </div>

        <Card className="p-5 sm:p-6">{children}</Card>

        {footer ? <div className="mt-5 text-center text-sm text-muted">{footer}</div> : null}
      </Container>
    </main>
  );
}
