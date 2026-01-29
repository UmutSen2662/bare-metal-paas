import { useEffect } from "react";
import { ServerCrash } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { App } from "../types";
import { SystemStats } from "../components/SystemStats";
import { AppCard } from "../components/AppCard";
import { Button } from "../components/ui/Button";

interface DashboardContext {
    openNewAppModal: () => void;
    refreshTrigger: number;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    // We receive the "open modal" function and "refresh" signal from the Layout (main.tsx)
    const { openNewAppModal, refreshTrigger } = useOutletContext<DashboardContext>();

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

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8">
            {/* Heads Up Display (HUD) */}
            <div className="mb-12">
                <div className="flex items-center gap-2 mb-6 border-b border-iron-800 pb-2">
                    <div className="h-2 w-2 bg-forge-500 rounded-sm"></div>
                    <h2 className="text-sm font-display font-bold text-slate-400 uppercase tracking-widest">System Telemetry</h2>
                </div>
                <SystemStats />
            </div>

            {/* Deployment Grid */}
            <div>
                <div className="flex items-center justify-between mb-6 border-b border-iron-800 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-forge-500 rounded-sm"></div>
                        <h2 className="text-sm font-display font-bold text-slate-400 uppercase tracking-widest">
                            Active Deployments
                        </h2>
                    </div>
                    <span className="bg-iron-800 text-forge-500 font-mono text-xs px-2 py-0.5 rounded border border-iron-700">
                        COUNT: {apps.length}
                    </span>
                </div>

                {apps.length === 0 ? (
                    <div className="text-center py-20 bg-iron-900/50 rounded-xl border border-dashed border-iron-700 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-iron-800/50 text-iron-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-iron-700">
                            <ServerCrash size={40} />
                        </div>
                        <h3 className="text-xl font-display font-bold text-white mb-2 tracking-wide">SYSTEM IDLE</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-8 font-mono text-sm">
                            No active workloads detected. Initialize a new deployment to begin.
                        </p>
                        <Button
                            onClick={openNewAppModal}
                            variant="primary"
                            size="lg"
                        >
                            INITIALIZE DEPLOYMENT
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {apps.map((app) => (
                            <AppCard key={app.id || app.name} app={app} onClick={(a) => navigate(`/apps/${a.name}`)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}