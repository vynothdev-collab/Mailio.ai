import { Card, CardContent } from "@/components/ui/card";
import { MOCK_ACCOUNT_INFO } from "../mock";

export function AccountInfoCard() {
  const { accountId, memberSince, plan, status } = MOCK_ACCOUNT_INFO;

  const tiles = [
    { label: "Account ID",    value: accountId   },
    { label: "Member Since",  value: memberSince },
    { label: "Current Plan",  value: plan        },
    {
      label: "Status",
      value: (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardContent className="pt-3 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Account Info</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Read-only account details</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-muted/30 px-3 py-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
              {typeof value === "string"
                ? <p className="text-sm font-semibold truncate">{value}</p>
                : value}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
