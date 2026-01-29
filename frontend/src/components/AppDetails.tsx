import { useEffect, useRef, useState } from "react";
import { Trash2, ExternalLink, Terminal, Edit, Clipboard, Check, Webhook } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-start mb-10 border-b border-iron-800 pb-6">
                <div className="flex gap-6 items-center">
                    <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wide">{app.name}</h1>
                    <div className="flex items-center gap-2 px-3 py-1 bg-iron-900 border border-iron-800 rounded-full">
                        <span className={`relative flex h-2 w-2`}>
                            {app.status === "running" && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                            )}
                            <span
                                className={`relative inline-flex rounded-full h-2 w-2 ${app.status === "running" ? "bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-status-error shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`}
                            ></span>
                        </span>
                        <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-widest ${app.status === "running" ? "text-status-success" : "text-status-error"}`}
                        >
                            {app.status}
                        </span>
                    </div>
                    <a
                        href={`http://${app.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-fit inline-flex items-center gap-2 text-forge-500 font-mono text-sm border border-iron-800 bg-iron-900 px-3 py-1 rounded hover:border-forge-500 transition-colors"
                    >
                        {app.domain} <ExternalLink size={14} />
                    </a>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={() => onEdit(app)}
                        variant="secondary"
                        size="md"
                        className="flex items-center gap-2 uppercase text-xs tracking-wider"
                    >
                        <Edit size={16} /> Edit
                    </Button>
                    <Button
                        onClick={() => onDelete(app.name)}
                        variant="secondary"
                        size="md"
                        className="flex items-center gap-2 uppercase text-xs tracking-wider hover:bg-red-900/20 hover:border-red-500/50 hover:text-red-400"
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
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                    Repository
                                </div>
                                <div className="text-sm text-slate-300 hover:text-forge-500 font-mono bg-iron-950 p-2.5 rounded border border-iron-800 truncate">
                                    <a href={app.repo_url} target="_blank" rel="noreferrer">
                                        {app.repo_url}
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
                                    {copied ? (
                                        <Check size={16} className="text-status-success" />
                                    ) : (
                                        <Clipboard size={16} />
                                    )}
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
                                <code className="text-xs text-status-success bg-iron-950 block p-2.5 rounded border border-iron-800 font-mono break-all">
                                    {app.start_command}
                                </code>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Logs Column */}
                <div className="lg:col-span-2 flex flex-col h-[70vh]">
                    <Card className="flex-1 flex flex-col overflow-hidden bg-iron-950 border-iron-800">
                        <CardHeader className="bg-iron-900 border-b border-iron-800 p-4 flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-mono flex items-center gap-2 uppercase tracking-widest text-slate-400">
                                <Terminal size={16} className="text-forge-500" /> Live Runtime Logs
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
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
