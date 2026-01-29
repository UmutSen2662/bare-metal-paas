import { useEffect, useState } from "react";
import { ServerCrash, Search } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { App } from "../types";
import { SystemStats } from "../components/SystemStats";
import { AppCard } from "../components/AppCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

interface DashboardContext {
    openNewAppModal: () => void;
    refreshTrigger: number;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    // We receive the "open modal" function and "refresh" signal from the Layout (main.tsx)
    const { openNewAppModal, refreshTrigger } = useOutletContext<DashboardContext>();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: apps = [] } = useQuery<App[]>({
        queryKey: ["apps"],
        queryFn: async () => {
            const res = await fetch("/api/apps");
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
        },
        refetchInterval: 5000,
    });

    useEffect(() => {
        if (refreshTrigger > 0) {
            queryClient.invalidateQueries({ queryKey: ["apps"] });
        }
    }, [refreshTrigger, queryClient]);

    const filteredApps = apps.filter((app) => app.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8">
            {/* Heads Up Display (HUD) */}
            <div className="mb-12">
                <div className="flex items-center gap-2 mb-6 border-b border-iron-800 pb-2">
                    <div className="h-2 w-2 bg-forge-500 rounded-sm"></div>
                    <h2 className="font-display font-bold text-slate-400 uppercase tracking-widest">
                        System Telemetry
                    </h2>
                </div>
                <SystemStats />
            </div>

            {/* Deployment Grid */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-iron-800 pb-4 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-forge-500 rounded-sm"></div>
                        <h2 className="font-display font-bold text-slate-400 uppercase tracking-widest">
                            Active Deployments
                        </h2>
                    </div>

                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <Input
                            placeholder="SEARCH APPS..."
                            className="pl-9 h-9 text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {apps.length === 0 ? (
                    <div className="text-center py-20 bg-iron-900/50 rounded-xl border border-dashed border-iron-700 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-iron-800/50 text-iron-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-iron-700">
                            <ServerCrash size={40} />
                        </div>
                        <h3 className="text-xl font-display font-bold text-white mb-2 tracking-wide">SYSTEM IDLE</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-8 font-mono">
                            No active workloads detected. Initialize a new deployment to begin.
                        </p>
                        <Button onClick={openNewAppModal} variant="primary" size="lg">
                            INITIALIZE DEPLOYMENT
                        </Button>
                    </div>
                ) : filteredApps.length === 0 ? (
                    <div className="text-center py-20 bg-iron-900/50 rounded-xl border border-dashed border-iron-700 backdrop-blur-sm">
                        <div className="w-16 h-16 bg-iron-800/50 text-iron-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-iron-700">
                            <Search size={32} />
                        </div>
                        <h3 className="text-lg font-display font-bold text-white mb-1 tracking-wide">NO MATCHES</h3>
                        <p className="text-slate-500 font-mono text-sm">No applications match "{searchQuery}"</p>
                        <Button
                            onClick={() => setSearchQuery("")}
                            variant="secondary"
                            size="sm"
                            className="mt-4 text-xs uppercase tracking-wider"
                        >
                            Clear Search
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredApps.map((app) => (
                            <AppCard key={app.id || app.name} app={app} onClick={(a) => navigate(`/apps/${a.name}`)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
