import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const controlClass =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent-strong";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-sm text-accent-strong">{error}</span> : null}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | "";
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 rounded-lg border text-sm transition-colors duration-200",
              selected
                ? "border-accent-strong bg-accent-strong text-on-accent"
                : "border-line bg-canvas text-ink hover:border-accent",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
