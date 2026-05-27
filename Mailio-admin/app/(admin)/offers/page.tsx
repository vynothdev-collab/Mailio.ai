import Card from "@/components/ui/Card";

export default function OffersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Offers &amp; Discounts</h1>
      <Card className="p-8 text-center">
        <p className="text-text-muted text-sm">
          Offers and discounts management is not available yet — there is no coupons or discounts table in the current database schema.
        </p>
      </Card>
    </div>
  );
}
