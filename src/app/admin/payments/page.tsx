import { AdminPaymentManager } from "@/components/admin/admin-payment-manager";
import { PageHeader } from "@/components/ui";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Admin finance"
        title="Payments"
        description="Record money received from shops and keep a permanent manual payment and renewal history. No payment gateway is used."
      />
      <AdminPaymentManager />
    </div>
  );
}
