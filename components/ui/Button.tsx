import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-tint text-primary hover:bg-tint/80",
  ghost: "bg-transparent text-primary hover:bg-tint/60",
};

export function Button({
  variant = "primary",
  icon: Icon,
  fullWidth = false,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-input px-5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {Icon && <Icon aria-hidden className="size-4" />}
      {children}
    </button>
  );
}
