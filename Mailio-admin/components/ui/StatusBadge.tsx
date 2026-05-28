type Tone =
  | "green"
  | "red"
  | "amber"
  | "blue"
  | "purple"
  | "gray"
  | "orange"
  | "sky"
  | "indigo";

interface Props {
  label: string;
  tone?: Tone;
  dot?: boolean;
}

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  gray: "bg-gray-100 text-gray-600",
  orange: "bg-orange-50 text-orange-700",
  sky: "bg-sky-50 text-sky-700",
  indigo: "bg-indigo-50 text-indigo-700",
};

const DOTS: Record<Tone, string> = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  gray: "bg-gray-400",
  orange: "bg-orange-500",
  sky: "bg-sky-500",
  indigo: "bg-indigo-500",
};

export default function StatusBadge({ label, tone = "gray", dot = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${TONES[tone]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOTS[tone]}`} />}
      {label}
    </span>
  );
}
