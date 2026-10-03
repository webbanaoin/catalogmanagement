import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { PageHeader } from "@/components/ui";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Sprint 5"
        title="Shop analytics"
        description="Understand catalogue traffic, product interest and customer actions without exposing another shop's data."
      />
      <AnalyticsDashboard />
    </div>
  );
}
