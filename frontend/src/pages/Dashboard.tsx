import { useState, useEffect } from "react";
import { ServerCrash } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { App } from "../types";
import { SystemStats } from "../components/SystemStats";
import { AppCard } from "../components/AppCard";

interface DashboardContext {
    openNewAppModal: () => void;
    refreshTrigger: number;
}

export default function Dashboard() {
    const [apps, setApps] = useState<App[]>([]);
    const navigate = useNavigate();
    // We receive the "open modal" function and "refresh" signal from the Layout (main.tsx)
    const { openNewAppModal, refreshTrigger } = useOutletContext<DashboardContext>();

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const res = await fetch("/api/apps");
                if (res.ok) {
                    const data = await res.json();
                    setApps(data || []);
                }
            } catch (error) {
                console.error("Failed to fetch apps", error);
            }
        };

        fetchApps();
    }, [refreshTrigger]);

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8">
            {/* Heads Up Display (HUD) */}
            <div className="mb-12">
                <div className="flex items-center gap-2 mb-6 border-b border-iron-800 pb-2">
                    <div className="h-2 w-2 bg-forge-500 rounded-sm"></div>
                    <h2 className="text-sm font-display font-bold text-slate-400 uppercase tracking-widest">
                        System Telemetry
                    </h2>
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
                        <button
                            onClick={openNewAppModal}
                            className="bg-forge-600 hover:bg-forge-500 text-white font-display font-bold py-3 px-6 rounded transition-all duration-200 shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] cursor-pointer"
                        >
                            INITIALIZE DEPLOYMENT
                        </button>
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
