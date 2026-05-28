import { LucideIcon, Inbox } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon: Icon = Inbox, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
