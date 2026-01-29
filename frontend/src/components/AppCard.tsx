import { Box, ExternalLink, Globe, Terminal, Activity } from "lucide-react";
import type { App } from "../types";

interface AppCardProps {
    app: App;
    onClick: (app: App) => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
    return (
        <div
            onClick={() => onClick(app)}
            className="group relative overflow-hidden rounded-xl border border-iron-800 bg-iron-900 transition-all duration-300 hover:border-forge-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] cursor-pointer flex flex-col"
        >
            {/* Darker Header */}
            <div className="bg-iron-950/50 p-4 border-b border-iron-800 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-iron-950 rounded border border-iron-800 text-forge-500 transition-colors">
                        <Box size={20} />
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-white text-lg tracking-wide uppercase transition-colors">
                            {app.name}
                        </h3>
                    </div>
                </div>
                {/* Traffic Light Status */}
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-400 font-mono bg-iron-950/30 p-2.5 rounded border border-iron-800/50">
                        <Globe size={14} className="text-forge-500" />
                        <span className="truncate flex-1 hover:text-white transition-colors">{app.domain}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400 font-mono bg-iron-950/30 p-2.5 rounded border border-iron-800/50">
                        <Terminal size={14} className="text-forge-500" />
                        <span className="truncate flex-1 text-xs">{app.language_version}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400 font-mono bg-iron-950/30 p-2.5 rounded border border-iron-800/50">
                        <Activity size={14} className="text-forge-500" />
                        <span className="truncate flex-1 text-xs">
                            PORT: <span className="text-white">{app.port}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="px-5 pb-5 pt-0 mt-auto flex gap-3 items-center">
                <p className="flex-1 text-sm">Click to view details</p>

                <a
                    href={`http://${app.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-forge-500 hover:bg-forge-600 text-white text-sm font-bold uppercase tracking-wide py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    title="Open Deployment"
                >
                    <ExternalLink size={20} />
                </a>
            </div>

            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none opacity-0 transition-opacity"></div>
        </div>
    );
}
