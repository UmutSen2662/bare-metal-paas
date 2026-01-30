import { useEffect, useRef, useState } from "react";
import {
    Trash2,
    ExternalLink,
    Terminal,
    Edit,
    Clipboard,
    Check,
    Webhook,
    RefreshCw,
    Power,
    Play,
    Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { App } from "../types";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";

interface AppDetailsProps {
    app: App;
    onDelete: (name: string) => void;
    onEdit: (app: App) => void;
}

export function AppDetails({ app: initialApp, onDelete, onEdit }: AppDetailsProps) {
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // 1. Live App Status
    const { data: app } = useQuery<App>({
        queryKey: ["app", initialApp.name],
        queryFn: async () => {
            const res = await fetch(`/api/apps/${initialApp.name}`);
            if (!res.ok) throw new Error("Failed to fetch app");
            return res.json();
        },
        initialData: initialApp,
        refetchInterval: 2000,
    });

    // 2. Live Logs
    const { data: logsData } = useQuery<{ logs: string }>({
        queryKey: ["app-logs", initialApp.name],
        queryFn: async () => {
            const res = await fetch(`/api/apps/${initialApp.name}/logs`);
            if (!res.ok) throw new Error("Failed to fetch logs");
            return res.json();
        },
        initialData: { logs: "Loading logs..." },
        refetchInterval: 2000,
    });

    const logs = logsData.logs;

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const webhookUrl = app.deploy_token ? `${window.location.origin}/api/hooks/${app.deploy_token}` : "Unavailable";

    const copyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAction = async (action: "redeploy" | "start" | "stop") => {
        if (isLoading) return;

        setIsLoading(action);
        try {
            const res = await fetch(`/api/apps/${app.name}/${action}`, { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Action failed");
            }
            await queryClient.invalidateQueries({ queryKey: ["app", app.name] });
            await queryClient.invalidateQueries({ queryKey: ["app-logs", app.name] });
        } catch (err) {
            console.error(err);
            alert(`Failed to ${action} app: ${err}`);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-start mb-10 border-b border-iron-800 pb-6">
                <div className="flex gap-6 items-center">
                    <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wide">{app.name}</h1>
                    <div className="flex items-center gap-2 p-2.5 bg-iron-900 border border-iron-800 rounded-full">
                        <span className={`relative flex h-2 w-2`}>
                            {app.status === "running" && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
                            )}
                            <span
                                className={`relative inline-flex rounded-full h-2 w-2 ${app.status === "running" ? "bg-green shadow-[var(--shadow-success)]" : "bg-red shadow-[var(--shadow-error)]"}`}
                            ></span>
                        </span>
                        <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-widest ${app.status === "running" ? "text-green" : "text-red"}`}
                        >
                            {app.status}
                        </span>
                    </div>
                    <a
                        href={`http://${app.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-fit inline-flex items-center gap-2 text-forge-500 font-mono text-sm border border-iron-800 bg-iron-900 p-2.5 rounded hover:border-forge-500/50 transition-colors"
                    >
                        {app.domain} <ExternalLink size={14} />
                    </a>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={() => handleAction("redeploy")}
                        variant="secondary"
                        size="md"
                        disabled={!!isLoading}
                        className="flex items-center gap-2 uppercase text-xs tracking-wider hover:text-forge-500 hover:border-forge-500/50"
                    >
                        {isLoading === "redeploy" ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        Redeploy
                    </Button>

                    {app.status === "running" ? (
                        <Button
                            onClick={() => handleAction("stop")}
                            variant="secondary"
                            size="md"
                            disabled={!!isLoading}
                            className="flex items-center gap-2 uppercase text-xs tracking-wider hover:border-red/50 hover:text-red"
                        >
                            {isLoading === "stop" ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Power size={16} />
                            )}
                            Stop
                        </Button>
                    ) : (
                        <Button
                            onClick={() => handleAction("start")}
                            variant="secondary"
                            size="md"
                            disabled={!!isLoading}
                            className="flex items-center gap-2 uppercase text-xs tracking-wider hover:border-green/50 hover:text-green"
                        >
                            {isLoading === "start" ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Play size={16} />
                            )}
                            Start
                        </Button>
                    )}

                    <div className="w-px h-8 bg-iron-800 mx-2"></div>

                    <Button
                        onClick={() => onEdit(app)}
                        variant="secondary"
                        size="md"
                        className="flex items-center gap-2 uppercase text-xs tracking-wider hover:border-forge-500/50 hover:text-forge-500"
                    >
                        <Edit size={16} /> Edit
                    </Button>
                    <Button
                        onClick={() => {
                            onDelete(app.name);
                        }}
                        variant="secondary"
                        size="md"
                        className="flex items-center gap-2 uppercase text-xs tracking-wider hover:border-red/50 hover:text-red"
                    >
                        <Trash2 size={16} /> Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Info Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="p-6 py-4">
                            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-widest text-slate-400">
                                <div className="w-1.5 h-4 bg-forge-500 rounded-sm"></div>
                                CONFIGURATION
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-4 flex flex-wrap gap-5 justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                    Repository
                                </div>
                                <div className="text-sm text-forge-500 font-mono bg-iron-950 p-2.5 rounded border border-iron-800 hover:border-forge-500/50 transition-colors">
                                    <a
                                        className="flex items-center gap-2 w-full"
                                        href={app.repo_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={app.repo_url}
                                    >
                                        {app.repo_url.substring(app.repo_url.lastIndexOf("/") + 1).replace(".git", "")}{" "}
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                    Language
                                </div>
                                <div className="text-sm text-slate-300 font-medium bg-iron-950 p-2.5 rounded border border-iron-800 inline-block">
                                    {app.language_version}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                    Port
                                </div>
                                <div className="text-sm text-slate-300 font-mono bg-iron-950 p-2.5 rounded border border-iron-800 inline-block">
                                    {app.port}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-6 py-4">
                            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-widest text-slate-400">
                                <div className="w-1.5 h-4 bg-forge-500 rounded-sm"></div>
                                CONTINUOUS DEPLOYMENT
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-4 space-y-4">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-2">
                                <Webhook size={14} /> Webhook URL
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs text-slate-400 bg-iron-950 block p-2.5 rounded font-mono break-all border border-iron-800 truncate">
                                    {webhookUrl}
                                </code>
                                <Button
                                    onClick={copyWebhook}
                                    variant="secondary"
                                    size="icon"
                                    className="h-9 w-9 bg-iron-950"
                                    title="Copy to clipboard"
                                >
                                    {copied ? <Check size={16} className="text-green" /> : <Clipboard size={16} />}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Add this URL to your GitHub/GitLab repository settings under "Webhooks" (Content-Type:
                                application/json).
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-6 py-4">
                            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-widest text-slate-400">
                                <div className="w-1.5 h-4 bg-forge-500 rounded-sm"></div>
                                COMMANDS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-4 space-y-5">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                    Build
                                </div>
                                <code className="text-xs text-forge-400 bg-iron-950 block p-2.5 rounded border border-iron-800 font-mono break-all">
                                    {app.build_command}
                                </code>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                    Start
                                </div>
                                <code className="text-xs text-green bg-iron-950 block p-2.5 rounded border border-iron-800 font-mono break-all">
                                    {app.start_command}
                                </code>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Logs Column */}
                <div className="lg:col-span-2 flex flex-col h-[70vh] lg:h-auto lg:block lg:relative">
                    <Card className="flex-1 lg:absolute lg:inset-0 flex flex-col overflow-hidden bg-iron-950 border-iron-800">
                        <CardHeader className="bg-iron-900 border-b border-iron-800 p-4 flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-mono flex items-center gap-2 uppercase tracking-widest text-slate-400">
                                <Terminal size={16} className="text-forge-500" /> Live Runtime Logs
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green shadow-[var(--shadow-success-strong)]"></span>
                                </span>
                                <span className="text-xs text-slate-500 font-mono">LIVE FEED</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden bg-black/50">
                            <div
                                ref={logsContainerRef}
                                className="h-full w-full p-4 overflow-y-auto font-mono text-sm custom-scrollbar"
                            >
                                <pre className="whitespace-pre-wrap text-slate-400 leading-relaxed">{logs}</pre>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
