import { Box, ExternalLink, Globe, Terminal, Activity } from "lucide-react";
import type { App } from "../types";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/Card";
import { Button } from "./ui/Button";

interface AppCardProps {
    app: App;
    onClick: (app: App) => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
    return (
        <Card
            onClick={() => onClick(app)}
            className="group relative overflow-hidden transition-all duration-300 hover:border-forge-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] cursor-pointer flex flex-col"
        >
            {/* Darker Header */}
            <CardHeader className="bg-iron-950/50 flex flex-row justify-between items-center transition-colors">
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
                        {app.status === "running" ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-status-error shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                        )}
                    </span>
                </div>
            </CardHeader>

            {/* Body */}
            <CardContent className="flex-1 flex flex-col gap-4 mt-4">
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
            </CardContent>

            {/* Footer / Actions */}
            <CardFooter className="flex gap-3">
                <p className="flex-1 text-sm">Click to view details</p>

                <Button
                    variant="primary"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(`http://${app.domain}`, "_blank", "noreferrer");
                    }}
                    title="Open Deployment"
                >
                    <ExternalLink size={18} />
                </Button>
            </CardFooter>

            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none opacity-0 transition-opacity"></div>
        </Card>
    );
}
