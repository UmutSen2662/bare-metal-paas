import { useQuery } from "@tanstack/react-query";
import { Card } from "./ui/Card";

interface SystemStatsData {
    cpu_percent: number;
    memory: {
        total: number;
        available: number;
        percent: number;
    };
    disk: {
        total: number;
        free: number;
        percent: number;
    };
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

interface StatCardProps {
    label: string;
    subLabel: string;
    percentage: number;
}

const StatCard = ({ label, subLabel, percentage }: StatCardProps) => {
    // Determine color based on value
    const strokeColor = percentage > 80 ? "var(--color-red)" : "var(--color-forge-500)"; // red or forge-500

    return (
        <Card className="flex items-center justify-between p-5 relative overflow-hidden group">
            {/* 1. LEFT SIDE: Text Labels */}
            <div className="flex flex-col z-10">
                <span className="text font-bold tracking-widest text-slate-300 uppercase mb-1">{label}</span>
                {/* The "Comparison Stat Thingy" goes here */}
                <span className="text-sm font-mono text-slate-400">{subLabel}</span>
            </div>

            {/* 2. RIGHT SIDE: Gauge + Value */}
            <div className="relative w-20 h-20 flex items-center justify-center">
                {/* SVG Ring */}
                <svg className="w-full h-full transform -rotate-90">
                    {/* Track */}
                    <circle cx="40" cy="40" r="36" stroke="var(--color-iron-800)" strokeWidth="6" fill="transparent" />
                    {/* Progress */}
                    <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke={strokeColor}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={226}
                        strokeDashoffset={226 - (226 * percentage) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* 3. CENTER: The Value (Absolute positioned inside the ring) */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-display font-bold text-white">{Math.round(percentage)}%</span>
                </div>
            </div>
        </Card>
    );
};

export function SystemStats() {
    const { data: stats, isLoading } = useQuery<SystemStatsData>({
        queryKey: ["system-stats"],
        queryFn: async () => {
            const res = await fetch("/api/system-stats");
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
        },
        refetchInterval: 2000,
    });

    if (isLoading || !stats)
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-iron-900/80 backdrop-blur-md border border-iron-800 rounded-xl h-24 animate-pulse"
                    ></div>
                ))}
            </div>
        );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard label="CPU Load" subLabel="Core Utilization" percentage={stats.cpu_percent} />
            <StatCard
                label="Memory"
                subLabel={`${formatBytes(stats.memory.total - stats.memory.available)} / ${formatBytes(stats.memory.total)}`}
                percentage={stats.memory.percent}
            />
            <StatCard
                label="Storage"
                subLabel={`${formatBytes(stats.disk.total - stats.disk.free)} / ${formatBytes(stats.disk.total)}`}
                percentage={stats.disk.percent}
            />
        </div>
    );
}
