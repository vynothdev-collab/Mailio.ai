import Card from "@/components/ui/Card";

export default function ExpiryPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Subscription Expiry</h1>
      <Card className="p-8 text-center">
        <p className="text-text-muted text-sm">
          Subscription expiry tracking is not available yet — there is no subscription expiry date field in the current user schema.
        </p>
      </Card>
    </div>
  );
}
