import Card from "@/components/ui/Card";

export default function PlansPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Plans Management</h1>
      <Card className="p-8 text-center">
        <p className="text-text-muted text-sm">
          Plans management is not available yet — there is no plans or pricing table in the current database schema.
        </p>
      </Card>
    </div>
  );
}
