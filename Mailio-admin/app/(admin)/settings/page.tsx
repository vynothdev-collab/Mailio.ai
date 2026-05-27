import Card from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Settings</h1>
      <Card className="p-8 text-center">
        <p className="text-text-muted text-sm">
          Settings management is not available yet — no admin settings schema or endpoints have been defined.
        </p>
      </Card>
    </div>
  );
}
