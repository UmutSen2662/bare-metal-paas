import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                "flex w-full rounded-md border p-3 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "bg-iron-950 border-iron-800 text-slate-200 placeholder:text-slate-500 font-mono",
                "focus:border-forge-500 focus:ring-1 focus:ring-forge-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = "Input";

export { Input };
