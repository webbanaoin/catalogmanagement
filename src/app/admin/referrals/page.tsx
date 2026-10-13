import { AdminReferralManager } from "@/components/admin/admin-referral-manager";
import { PageHeader } from "@/components/ui";

export default function AdminReferralsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Marketing & commissions"
        title="Referrals & Partner Earnings"
        description="Approve marketing partners, manage monthly/yearly commission rules, track referred shops, settle payouts and monitor Webbanao revenue after referral deductions."
      />
      <AdminReferralManager />
    </div>
  );
}
