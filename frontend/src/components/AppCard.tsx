import { useState } from "react";
import { Box, ExternalLink, RefreshCw, Power, Play, ArrowRight, Loader2 } from "lucide-react";
import type { App } from "../types";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/Card";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface AppCardProps {
    app: App;
    onClick: (app: App) => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
    const appUrl = `http://${app.domain}`;
    const isRunning = app.status === "running";
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleAction = async (e: React.MouseEvent, action: "redeploy" | "start" | "stop") => {
        e.stopPropagation();
        if (isLoading) return;

        setIsLoading(action);
        try {
            const res = await fetch(`/api/apps/${app.name}/${action}`, { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Action failed");
            }
            await queryClient.invalidateQueries({ queryKey: ["apps"] });
            // For redeploy, we might want to invalidate logs too if we were viewing them, but that's in details page.
        } catch (err) {
            console.error(err);
            alert(`Failed to ${action} app: ${err}`);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300",
                "border-iron-800 bg-iron-900",
                "flex flex-col p-0 gap-0",
            )}
        >
            {/* Header */}
            <CardHeader className="flex-row items-center justify-between p-4 my-0 bg-iron-950/30 border-iron-800/50 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-forge-900/20 border border-forge-900/50 text-forge-500 transition-colors">
                        <Box size={18} />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white tracking-wide uppercase">{app.name}</h3>
                </div>
                {/* Traffic Light */}
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        {isRunning ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green shadow-[var(--shadow-success)]"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red shadow-[var(--shadow-error)]"></span>
                        )}
                    </span>
                </div>
            </CardHeader>

            {/* Body */}
            <CardContent className="p-5 pt-5 flex-1 flex flex-col gap-5">
                {/* Endpoint Pill */}
                <div className="flex items-center justify-between bg-iron-950/50 p-3 rounded border border-iron-800 group/link hover:border-forge-500/30 transition-colors">
                    <a
                        href={appUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-sm text-slate-300 group-hover/link:text-forge-500 truncate transition-colors flex-1 mr-2"
                    >
                        {app.domain}
                    </a>
                    <ExternalLink
                        size={12}
                        className="text-slate-500 group-hover/link:text-forge-500 transition-colors shrink-0"
                    />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={(e) => handleAction(e, "redeploy")}
                        variant="secondary"
                        disabled={!!isLoading}
                        className="gap-2 h-auto py-2.5 group/btn hover:text-forge-500 hover:border-forge-500/50"
                    >
                        {isLoading === "redeploy" ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <RefreshCw
                                size={14}
                                className="group-hover/btn:rotate-180 transition-transform duration-500"
                            />
                        )}
                        <span className="text-xs uppercase font-bold tracking-wider">Redeploy</span>
                    </Button>

                    {isRunning ? (
                        <Button
                            onClick={(e) => handleAction(e, "stop")}
                            variant="secondary"
                            disabled={!!isLoading}
                            className="gap-2 h-auto py-2.5 hover:border-red/50 hover:text-red"
                        >
                            {isLoading === "stop" ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Power size={14} />
                            )}
                            <span className="text-xs uppercase font-bold tracking-wider">Stop</span>
                        </Button>
                    ) : (
                        <Button
                            onClick={(e) => handleAction(e, "start")}
                            variant="secondary"
                            disabled={!!isLoading}
                            className="gap-2 h-auto py-2.5 hover:border-green/50 hover:text-green"
                        >
                            {isLoading === "start" ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Play size={14} />
                            )}
                            <span className="text-xs uppercase font-bold tracking-wider">Start</span>
                        </Button>
                    )}
                </div>
            </CardContent>

            {/* Hazard Footer - Navigation Trigger */}
            <CardFooter
                onClick={() => onClick(app)}
                className="relative h-10 border-t border-iron-800 p-0 cursor-pointer overflow-hidden group/footer flex items-center justify-center"
            >
                {/* Background Pattern (Hazard Stripes) */}
                <div
                    className="absolute inset-0 opacity-0 group-hover/footer:opacity-100 transition-opacity duration-300"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--color-hazard-stripe) 10px, var(--color-hazard-stripe) 20px)",
                    }}
                ></div>

                <div className="absolute inset-0 flex items-center justify-center bg-iron-950 group-hover/footer:bg-transparent transition-colors duration-300">
                    <span className="text-xs font-bold text-slate-500 group-hover/footer:text-forge-500 uppercase tracking-widest z-10 flex items-center gap-2 transition-colors">
                        View Details{" "}
                        <ArrowRight size={12} className="transition-transform group-hover/footer:translate-x-1" />
                    </span>
                </div>
            </CardFooter>
        </Card>
    );
}
