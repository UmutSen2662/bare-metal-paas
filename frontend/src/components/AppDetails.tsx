import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Trash2, ExternalLink, Terminal, Edit, Clipboard, Check, Webhook } from 'lucide-react';
import type { App } from '../types';

interface AppDetailsProps {
  app: App;
  onBack: () => void;
  onDelete: (name: string) => void;
  onEdit: (app: App) => void;
}

export function AppDetails({ app, onBack, onDelete, onEdit }: AppDetailsProps) {
  const [logs, setLogs] = useState<string>('Loading logs...');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/apps/${app.name}/logs`);
        if (res.ok) {
            const data = await res.json();
            setLogs(data.logs || 'No logs available.');
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [app.name]);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const webhookUrl = app.deploy_token 
    ? `${window.location.origin}/api/hooks/${app.deploy_token}` 
    : 'Unavailable';

  const copyWebhook = () => {
      navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{app.name}</h1>
          <a 
            href={`http://${app.domain}`} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            {app.domain} <ExternalLink size={16} />
          </a>
        </div>
        
        <div className="flex gap-3">
             <button
                onClick={() => onEdit(app)}
                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
            >
                <Edit size={18} /> Edit / Redeploy
            </button>
            <button
                onClick={() => onDelete(app.name)}
                className="flex items-center gap-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
            >
                <Trash2 size={18} /> Delete App
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Column */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Configuration</h3>
                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-semibold">Repository</div>
                        <div className="text-sm text-slate-700 truncate font-mono bg-slate-50 p-1.5 rounded mt-1">{app.repo_url}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-semibold">Language</div>
                        <div className="text-sm text-slate-700 font-medium mt-1">{app.language_version}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-semibold">Port</div>
                        <div className="text-sm text-slate-700 font-medium mt-1">{app.port}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Continuous Deployment</h3>
                <div className="space-y-2">
                    <div className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1">
                        <Webhook size={12} /> Webhook URL
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-slate-600 bg-slate-50 block p-2 rounded font-mono break-all border border-slate-200 truncate">
                            {webhookUrl}
                        </code>
                        <button 
                            onClick={copyWebhook}
                            className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={16} className="text-green-500" /> : <Clipboard size={16} />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Add this URL to your GitHub/GitLab repository settings under "Webhooks" (Content-Type: application/json).
                    </p>
                </div>
            </div>

             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Commands</h3>
                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-semibold">Build</div>
                        <code className="text-xs text-slate-600 bg-slate-50 block p-2 rounded mt-1 font-mono break-all">{app.build_command}</code>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-semibold">Start</div>
                        <code className="text-xs text-slate-600 bg-slate-50 block p-2 rounded mt-1 font-mono break-all">{app.start_command}</code>
                    </div>
                </div>
            </div>
        </div>

        {/* Logs Column */}
        <div className="lg:col-span-2 flex flex-col h-[600px]">
            <div className="bg-slate-950 rounded-xl shadow-lg flex flex-col h-full overflow-hidden border border-slate-800">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
                        <Terminal size={16} /> Runtime Logs (Live)
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-slate-500">Updates every 1s</span>
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
                    <pre className="whitespace-pre-wrap text-slate-300">{logs}</pre>
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
