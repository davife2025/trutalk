import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

/**
 * Placeholder component — restyle once Figma MCP design context (colors,
 * spacing, type scale) has been pulled into packages/config/tailwind-preset.js.
 */
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors";
  const variants: Record<string, string> = {
    primary: "bg-calm-600 text-white hover:bg-calm-900",
    secondary: "bg-calm-100 text-calm-900 hover:bg-calm-400",
    ghost: "bg-transparent text-calm-900 hover:bg-calm-50",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
