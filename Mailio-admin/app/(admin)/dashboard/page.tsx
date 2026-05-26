import Card from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Overview</h2>
        <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-400 text-sm">Chart placeholder — add chart library here</p>
        </div>
      </Card>
    </div>
  );
}

const STAT_CARDS = [
  { label: "Total Users", value: "—" },
  { label: "Active Plans", value: "—" },
  { label: "Revenue", value: "—" },
  { label: "Emails Sent", value: "—" },
];
