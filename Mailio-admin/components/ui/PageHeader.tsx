import { ReactNode } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Renders an in-page actions row. Title/subtitle are rendered globally
 * by the Header (driven by the route).
 */
export default function PageHeader({ title, subtitle, actions }: Props) {
  if (!title && !subtitle && !actions) return null;
  if (!title && !subtitle && actions) {
    return <div className="flex justify-end items-center gap-2 mb-4">{actions}</div>;
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
      <div>
        {title && <h2 className="text-lg font-bold text-text-primary tracking-tight">{title}</h2>}
        {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
