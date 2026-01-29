import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">System Status</h2>
                <SystemStats />
            </div>

            <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    Deployed Applications
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{apps.length}</span>
                </h2>

                {apps.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No apps deployed yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6">
                            Get started by deploying your first application to the bare metal infrastructure.
                        </p>
                        <button
                            onClick={openNewAppModal}
                            className="text-blue-600 font-medium hover:text-blue-700 hover:underline cursor-pointer"
                        >
                            Deploy now &rarr;
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {apps.map((app) => (
                            <AppCard key={app.id || app.name} app={app} onClick={(a) => navigate(`/apps/${a.name}`)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
