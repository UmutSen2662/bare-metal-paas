import { useEffect, useState, useRef } from "react";
import { Trash2, ExternalLink, Terminal, Edit, Clipboard, Check, Webhook } from "lucide-react";
import type { App } from "../types";

interface AppDetailsProps {
    app: App;
    onDelete: (name: string) => void;
    onEdit: (app: App) => void;
}

export function AppDetails({ app, onDelete, onEdit }: AppDetailsProps) {
    const [logs, setLogs] = useState<string>("Loading logs...");
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`/api/apps/${app.name}/logs`);
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data.logs || "No logs available.");
                }
            } catch (e) {
                console.error("Failed to fetch logs", e);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 1000);
        return () => clearInterval(interval);
    }, [app.name]);

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
                <div>
                    <h1 className="text-4xl font-display font-bold text-white mb-3 uppercase tracking-wide">
                        {app.name}
                    </h1>
                    <a
                        href={`http://${app.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-forge-500 hover:text-forge-400 font-mono text-sm border border-iron-800 bg-iron-900 px-3 py-1 rounded hover:border-forge-500 transition-colors"
                    >
                        {app.domain} <ExternalLink size={14} />
                    </a>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => onEdit(app)}
                        className="flex items-center gap-2 bg-iron-900 text-slate-300 border border-iron-700 hover:bg-iron-800 hover:text-white px-5 py-2.5 rounded-lg transition-colors font-bold uppercase text-xs tracking-wider cursor-pointer"
                    >
                        <Edit size={16} /> Edit
                    </button>
                    <button
                        onClick={() => onDelete(app.name)}
                        className="flex items-center gap-2 bg-iron-900 text-status-error border border-iron-700 hover:bg-red-950/30 hover:border-status-error/50 px-5 py-2.5 rounded-lg transition-colors font-bold uppercase text-xs tracking-wider cursor-pointer"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Info Column */}
                <div className="space-y-6">
                    <div className="bg-iron-900 rounded-xl border border-iron-800 p-6">
                        <h3 className="font-bold text-slate-200 mb-4 border-b border-iron-800 pb-2 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-forge-500 rounded-sm"></div>
                            CONFIGURATION
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                                    Repository
                                </div>
                                <div className="text-sm text-slate-300 font-mono bg-iron-950 p-2 rounded border border-iron-800 truncate">
                                    {app.repo_url}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                                    Language
                                </div>
                                <div className="text-sm text-slate-300 font-medium bg-iron-950 p-2 rounded border border-iron-800 inline-block">
                                    {app.language_version}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                                    Port
                                </div>
                                <div className="text-sm text-white font-mono font-bold bg-iron-950 p-2 rounded border border-iron-800 inline-block">
                                    {app.port}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-iron-900 rounded-xl border border-iron-800 p-6">
                        <h3 className="font-bold text-slate-200 mb-4 border-b border-iron-800 pb-2 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-forge-500 rounded-sm"></div>
                            CONTINUOUS DEPLOYMENT
                        </h3>
                        <div className="space-y-3">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-2">
                                <Webhook size={14} /> Webhook URL
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs text-slate-400 bg-iron-950 block p-2.5 rounded font-mono break-all border border-iron-800 truncate">
                                    {webhookUrl}
                                </code>
                                <button
                                    onClick={copyWebhook}
                                    className="p-2.5 bg-iron-950 border border-iron-800 hover:bg-iron-800 rounded text-slate-500 hover:text-white transition-colors cursor-pointer"
                                    title="Copy to clipboard"
                                >
                                    {copied ? (
                                        <Check size={16} className="text-status-success" />
                                    ) : (
                                        <Clipboard size={16} />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Add this URL to your GitHub/GitLab repository settings under "Webhooks" (Content-Type:
                                application/json).
                            </p>
                        </div>
                    </div>

                    <div className="bg-iron-900 rounded-xl border border-iron-800 p-6">
                        <h3 className="font-bold text-slate-200 mb-4 border-b border-iron-800 pb-2 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-forge-500 rounded-sm"></div>
                            COMMANDS
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                                    Build
                                </div>
                                <code className="text-xs text-forge-400 bg-iron-950 block p-2.5 rounded border border-iron-800 font-mono break-all">
                                    {app.build_command}
                                </code>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                                    Start
                                </div>
                                <code className="text-xs text-status-success bg-iron-950 block p-2.5 rounded border border-iron-800 font-mono break-all">
                                    {app.start_command}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logs Column */}
                <div className="lg:col-span-2 flex flex-col h-[600px]">
                    <div className="bg-iron-950 rounded-xl shadow-2xl flex flex-col h-full overflow-hidden border border-iron-800">
                        <div className="p-3 bg-iron-900 border-b border-iron-800 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-400 font-mono text-sm uppercase tracking-wider font-bold">
                                <Terminal size={16} className="text-forge-500" /> Live Runtime Logs
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                                </span>
                                <span className="text-xs text-slate-500 font-mono">LIVE FEED</span>
                            </div>
                        </div>
                        <div
                            ref={logsContainerRef}
                            className="flex-1 p-4 overflow-y-auto font-mono text-sm custom-scrollbar bg-black/50"
                        >
                            <pre className="whitespace-pre-wrap text-slate-400 leading-relaxed">{logs}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
