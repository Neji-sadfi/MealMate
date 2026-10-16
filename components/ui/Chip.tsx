import type { ButtonHTMLAttributes } from "react";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({ selected = false, type = "button", className = "", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
        selected ? "bg-primary text-primary-foreground" : "bg-surface text-foreground hover:bg-tint"
      } ${className}`}
      {...props}
    />
  );
}
