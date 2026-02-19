import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppCard } from "../components/AppCard";
import { SystemStats } from "../components/SystemStats";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../lib/utils";
import type { App } from "../types";

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

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

          <div className="w-full max-w-xs">
            <Input
              icon={<Search size={14} />}
              placeholder="SEARCH APPS..."
              className="h-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id || app.name}
              app={app}
              onClick={(a) => navigate(`/apps/${a.name}`)}
            />
          ))}

          {/* Ghost Card - Initialize Deployment (Only shown when not searching) */}
          {!searchQuery && (
            <button
              type="button"
              onClick={openNewAppModal}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl",
                "border-2 border-dashed border-iron-800 bg-iron-900/20",
                "hover:bg-iron-900/40 hover:border-forge-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.05)]",
                "transition-all duration-200 cursor-pointer",
              )}
            >
              <div className="w-16 h-16 rounded-full bg-iron-800/50 flex items-center justify-center border border-iron-700 group-hover:border-forge-500/50 group-hover:bg-iron-800 transition-colors">
                <Plus
                  size={32}
                  className="text-iron-500 group-hover:text-forge-500 transition-colors"
                />
              </div>
              <div className="text-center">
                <h3 className="font-display font-bold text-white mb-1 tracking-wide uppercase">
                  Deploy App
                </h3>
              </div>
            </button>
          )}

          {filteredApps.length === 0 && searchQuery && (
            <div className="col-span-full py-12 text-center">
              <div className="w-16 h-16 bg-iron-800/50 text-iron-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-iron-700">
                <Search size={32} />
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-1 tracking-wide uppercase">
                No Matches
              </h3>
              <p className="text-slate-500 font-mono text-sm">
                No applications match "{searchQuery}"
              </p>
              <Button
                onClick={() => setSearchQuery("")}
                variant="secondary"
                size="sm"
                className="mt-4 text-xs uppercase tracking-wider"
              >
                Clear Search
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
