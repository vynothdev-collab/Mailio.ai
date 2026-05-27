interface Props {
  active: boolean;
}

export default function AdminStatusBadge({ active }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-600"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-red-400"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
