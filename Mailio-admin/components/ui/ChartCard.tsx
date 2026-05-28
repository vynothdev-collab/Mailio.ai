import { ReactNode } from "react";
import Card from "./Card";

interface Props {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function ChartCard({ title, actions, children, footer, className = "" }: Props) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {actions}
      </div>
      <div>{children}</div>
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100">{footer}</div>
      )}
    </Card>
  );
}
