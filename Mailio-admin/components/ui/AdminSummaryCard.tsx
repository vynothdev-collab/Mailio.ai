import Card from "./Card";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "purple" | "orange" | "red";
}

const accentBg: Record<NonNullable<Props["accent"]>, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
};

export default function AdminSummaryCard({ label, value, sub, accent = "blue" }: Props) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accentBg[accent].split(" ")[1]}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </Card>
  );
}
