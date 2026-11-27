import { cn } from "@/lib/utils";

export function Monogram({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-sm text-accent-strong",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="6.5" r="2.2" fill="currentColor" />
      <circle cx="8" cy="25" r="2.2" fill="currentColor" />
      <circle cx="24" cy="25" r="2.2" fill="currentColor" />
      <path
        d="M16 9v7.2M16 16.2 8.8 22.4M16 16.2 23.2 22.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M16 14.4 17.5 16.2 16 18 14.5 16.2Z" fill="currentColor" />
    </svg>
  );
}

export function Kolam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="8" r="1.5" fill="currentColor" />
      <circle cx="24" cy="24" r="1.5" fill="currentColor" />
      <circle cx="24" cy="40" r="1.5" fill="currentColor" />
      <circle cx="8" cy="24" r="1.5" fill="currentColor" />
      <circle cx="40" cy="24" r="1.5" fill="currentColor" />
      <circle cx="13" cy="13" r="1.3" fill="currentColor" />
      <circle cx="35" cy="13" r="1.3" fill="currentColor" />
      <circle cx="13" cy="35" r="1.3" fill="currentColor" />
      <circle cx="35" cy="35" r="1.3" fill="currentColor" />
      <path
        d="M24 8c8 4 12 10 12 16s-4 12-12 16c-8-4-12-10-12-16s4-12 12-16Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M8 24c4-8 10-12 16-12s12 4 16 12c-4 8-10 12-16 12S12 32 8 24Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}
