import * as React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-forge-500/50 cursor-pointer",
                    // Variants
                    variant === "primary" &&
                        "bg-forge-600 text-white font-display hover:bg-forge-500 hover:shadow-forge-lg uppercase tracking-wider",
                    variant === "secondary" &&
                        "bg-iron-800 border border-iron-700 text-slate-300 hover:border-forge-500 hover:text-white",
                    variant === "ghost" && "bg-transparent text-slate-400 hover:text-forge-500 hover:bg-forge-500/10",
                    variant === "danger" && "bg-red/10 border border-red/50 text-red hover:bg-red hover:text-white",
                    // Sizes
                    size === "sm" && "h-8 px-3 text-xs",
                    size === "md" && "h-10 px-4 py-2 text-sm",
                    size === "lg" && "h-12 px-6 py-3 text-base",
                    size === "icon" && "h-10 w-10",
                    className,
                )}
                ref={ref}
                {...props}
            />
        );
    },
);
Button.displayName = "Button";

export { Button };
