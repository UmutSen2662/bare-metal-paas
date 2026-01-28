import { Box, ExternalLink, Globe, Terminal } from 'lucide-react';
import type { App } from '../types';

interface AppCardProps {
  app: App;
  onClick: (app: App) => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
  return (
    <div 
      onClick={() => onClick(app)}
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Box size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                {app.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-mono mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                Port: {app.port}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
            <Globe size={14} className="text-slate-400" />
            <span className="truncate flex-1">{app.domain}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
            <Terminal size={14} className="text-slate-400" />
            <span className="truncate flex-1">{app.language_version}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-medium">Click for details</span>
            <a 
                href={`http://${app.domain}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()} 
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Open Website"
            >
                <ExternalLink size={18} />
            </a>
        </div>
      </div>
    </div>
  );
}
