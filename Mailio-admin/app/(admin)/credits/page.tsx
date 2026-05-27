import Card from "@/components/ui/Card";

export default function CreditsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Credits &amp; Usage</h1>
      <Card className="p-8 text-center">
        <p className="text-text-muted text-sm">
          Credits and usage management is not available yet — there is no credits or billing table in the current database schema.
        </p>
      </Card>
    </div>
  );
}
