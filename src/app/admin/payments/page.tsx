import { AdminPaymentManager } from "@/components/admin/admin-payment-manager";
import { PageHeader } from "@/components/ui";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Admin finance & renewals"
        title="Payments & Subscription Intelligence"
        description="Track actual collections, weekly/monthly/quarterly revenue, payment methods, billing cycles, renewal pipeline, expiring subscriptions and full shop payment history. No payment gateway is used."
      />
      <AdminPaymentManager />
    </div>
  );
}
