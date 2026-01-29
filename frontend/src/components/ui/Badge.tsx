import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outline' | 'success';
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "border-transparent bg-forge-500 text-white shadow hover:bg-forge-600",
        variant === "outline" && "text-slate-400 border-iron-700",
        variant === "success" && "border-transparent bg-green-500/10 text-green-500",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
