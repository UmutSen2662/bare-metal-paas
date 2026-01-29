import React from "react";

interface CircularGaugeProps {
    value: number;
    label?: string; // Made optional as label is now external
    subLabel?: string;
    size?: number;
    strokeWidth?: number;
    showText?: boolean; // New prop to control text visibility
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
    value,
    label,
    subLabel,
    size = 120,
    strokeWidth = 8,
    showText = true,
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    // Determine color based on value
    const getStrokeColor = () => {
        if (value > 80) return "stroke-red drop-shadow-[var(--shadow-error)]";
        return `stroke-forge-500`;
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90 w-full h-full">
                    {/* Track */}
                    <circle
                        className="stroke-iron-800"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Fill */}
                    <circle
                        className={`${getStrokeColor()} transition-all duration-1000 ease-out`}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                </svg>
                {showText && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-mono font-bold text-white tracking-tighter">
                            {Math.round(value)}%
                        </span>
                    </div>
                )}
            </div>
            {label && (
                <div className="mt-2 text-center">
                    <div className="text-sm font-display font-bold text-slate-400 uppercase tracking-widest">
                        {label}
                    </div>
                    {subLabel && <div className="text-xs font-mono text-slate-500 mt-1">{subLabel}</div>}
                </div>
            )}
        </div>
    );
};
