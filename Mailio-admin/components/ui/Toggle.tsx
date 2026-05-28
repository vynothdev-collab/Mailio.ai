"use client";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}

export default function Toggle({ checked, onChange, label, description }: Props) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      {(label || description) && (
        <div className="flex-1">
          {label && <p className="text-sm font-medium text-text-primary">{label}</p>}
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
          checked ? "bg-primary-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
