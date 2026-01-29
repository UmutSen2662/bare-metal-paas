import { useEffect, useState } from "react";
import { Cpu, HardDrive, Zap } from "lucide-react";

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

export function SystemStats() {
    const [stats, setStats] = useState<SystemStatsData | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/system-stats");
                if (res.ok) setStats(await res.json());
            } catch (e) {
                console.error("Stats fetch failed", e);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!stats) return <div className="h-24 bg-slate-100 animate-pulse rounded-lg"></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* CPU */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Cpu size={24} />
                </div>
                <div className="flex-1">
                    <div className="text-sm text-slate-600 font-medium">CPU Usage</div>
                    <div className="text-xl font-bold text-slate-800">{stats.cpu_percent}%</div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${stats.cpu_percent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* RAM */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <Zap size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-end">
                        <div className="text-sm text-slate-600 font-medium">Memory</div>
                        <div className="text-xs text-slate-500 font-mono mb-0.5">
                            {formatBytes(stats.memory.total - stats.memory.available)} /{" "}
                            {formatBytes(stats.memory.total)}
                        </div>
                    </div>
                    <div className="text-xl font-bold text-slate-800">{stats.memory.percent}%</div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{ width: `${stats.memory.percent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Disk */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                    <HardDrive size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-end">
                        <div className="text-sm text-slate-600 font-medium">Disk Usage</div>
                        <div className="text-xs text-slate-500 font-mono mb-0.5">
                            {formatBytes(stats.disk.total - stats.disk.free)} / {formatBytes(stats.disk.total)}
                        </div>
                    </div>
                    <div className="text-xl font-bold text-slate-800">{stats.disk.percent}%</div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${stats.disk.percent}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
