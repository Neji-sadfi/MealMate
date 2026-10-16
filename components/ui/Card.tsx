import type { HTMLAttributes } from "react";

export type CardTone = "surface" | "tint" | "primary" | "warning";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

const toneClasses: Record<CardTone, string> = {
  surface: "bg-surface text-foreground shadow-sm",
  tint: "bg-tint text-foreground",
  primary: "bg-primary text-primary-foreground",
  warning: "bg-warning-bg text-foreground",
};

export function Card({ tone = "surface", className = "", ...props }: CardProps) {
  return <div className={`rounded-card p-4 ${toneClasses[tone]} ${className}`} {...props} />;
}
