import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, Terminal, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

function App() {
  const [apps, setApps] = useState([]);
  const [selectedView, setSelectedView] = useState('new-app'); // 'new-app' | 'deploy-logs'
  const [deployLogs, setDeployLogs] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    repo_url: '',
    domain: '',
    language_version: 'node@20',
    build_command: 'npm install && npm run build',
    start_command: 'npm start',
  });

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch apps", err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setDeployLogs("Starting deployment...\n");
    setSelectedView('deploy-logs');

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (res.ok) {
        setDeployLogs(prev => prev + data.logs + "\n\nSUCCESS! App deployed to: " + data.app_url);
        fetchApps();
      } else {
        setDeployLogs(prev => prev + (data.logs || "") + "\n\nERROR: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      setDeployLogs(prev => prev + "\n\nNetwork/System Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-slate-700 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <LayoutDashboard className="text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900">BareMetal</h1>
        </div>

        <div className="p-4">
          <button 
            onClick={() => setSelectedView('new-app')}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors font-medium shadow-sm mb-6"
          >
            <Plus size={18} /> New App
          </button>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Applications</h3>
            {apps.map(app => (
              <div key={app.id} className="group flex items-center justify-between px-2 py-2 hover:bg-slate-50 rounded-md cursor-default">
                <span className="font-medium text-slate-700">{app.name}</span>
                <a href={`http://${app.domain}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
            {apps.length === 0 && (
              <p className="text-sm text-slate-400 italic px-2">No apps deployed yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {selectedView === 'new-app' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Deploy New Application</h2>
            
            <form onSubmit={handleDeploy} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">App Name</label>
                  <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="my-app" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
                  <input required name="domain" value={formData.domain} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="app.example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Git Repository URL</label>
                <input required name="repo_url" value={formData.repo_url} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="https://github.com/user/repo.git" />
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                  <input required name="language_version" value={formData.language_version} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="node@20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Build Command</label>
                  <input required name="build_command" value={formData.build_command} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="npm install && npm run build" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Command</label>
                <input required name="start_command" value={formData.start_command} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="npm start" />
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white py-2 px-6 rounded-md font-medium transition-colors flex items-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                  {isLoading ? 'Deploying...' : 'Deploy App'}
                </button>
              </div>
            </form>
          </div>
        )}

        {selectedView === 'deploy-logs' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Terminal size={20} /> Deployment Logs
              </h2>
              <button onClick={() => setSelectedView('new-app')} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Back to Form</button>
            </div>
            
            <div className="flex-1 bg-slate-950 rounded-lg p-4 overflow-auto border border-slate-800 shadow-inner font-mono text-sm leading-relaxed">
              <pre className="text-green-400 whitespace-pre-wrap">{deployLogs}</pre>
              {isLoading && <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
