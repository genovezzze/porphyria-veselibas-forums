import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover shadow-soft disabled:opacity-50",
  secondary:
    "bg-surface text-ink border border-line hover:bg-background disabled:opacity-50",
  ghost: "bg-transparent text-primary hover:bg-background disabled:opacity-50",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  md: "min-h-[44px] px-4 text-[17px]",
  lg: "min-h-[52px] px-6 text-[18px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
