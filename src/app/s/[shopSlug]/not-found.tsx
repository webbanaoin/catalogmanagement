import Link from "next/link";

import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { EmptyState, buttonClassName, Container } from "@/components/ui";

export default function StorefrontNotFound() {
  return (
    <StorefrontShell>
      <Container className="py-12">
        <EmptyState
          title="This catalogue is not available"
          description="The shop, category or product may not exist or may not currently be public."
          action={
            <Link href="/" className={buttonClassName("secondary")}>
              Go to home
            </Link>
          }
        />
      </Container>
    </StorefrontShell>
  );
}
