import Card from "@/components/ui/Card";

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Reports &amp; Analytics</h1>
      <Card className="p-8 text-center">
        <p className="text-text-muted text-sm">
          Advanced reports and analytics are not available yet — chart library integration and dedicated reporting endpoints are needed.
        </p>
      </Card>
    </div>
  );
}
