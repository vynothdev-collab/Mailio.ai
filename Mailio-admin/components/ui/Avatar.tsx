interface Props {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
};

const PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-rose-500",
];

function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

export default function Avatar({ name, size = "sm", className = "" }: Props) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = PALETTE[hashString(name) % PALETTE.length];
  return (
    <div
      className={`${bg} ${SIZE[size]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}
