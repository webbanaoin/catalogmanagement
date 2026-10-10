import { PageHeader } from "@/components/ui";
import { AdminPaymentReceiverSettings } from "@/components/admin/admin-payment-receiver-settings";

export default function AdminPaymentSettingsPage() {
  return <div className="space-y-6">
    <PageHeader eyebrow="Official collections" title="Payment Receiver Settings"
      description="Manage authorized UPI and cash recipients. Changes are logged for audit; previous payment recipient snapshots remain unchanged." />
    <AdminPaymentReceiverSettings />
  </div>;
}
