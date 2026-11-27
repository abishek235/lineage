import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-accent-strong text-on-accent hover:brightness-95",
  secondary: "border border-line bg-surface text-ink hover:border-accent",
  ghost: "text-muted hover:bg-accent-soft hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
