import { useState, useEffect } from 'react';
import { LayoutDashboard, Plus } from 'lucide-react';
import type { App } from './types';
import { SystemStats } from './components/SystemStats';
import { AppCard } from './components/AppCard';
import { DeployModal } from './components/DeployModal';
import { AppDetails } from './components/AppDetails';

function AppDashboard() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<App | null>(null);
  const [baseDomain, setBaseDomain] = useState<string>('paas.local');

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setBaseDomain(data.base_domain);
      }
    } catch (error) {
      console.error('Failed to fetch config', error);
    }
  };

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch apps', error);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchApps();
  }, []);

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action is irreversible.`)) return;

    try {
      const res = await fetch(`/api/apps/${name}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedApp(null); // Return to dashboard
        fetchApps();
      } else {
        alert('Failed to delete app');
      }
    } catch (error) {
      console.error('Failed to delete app', error);
    }
  };

  const handleEdit = (app: App) => {
      setModalInitialData(app);
      setIsDeployModalOpen(true);
  };

  const handleOpenNew = () => {
      setModalInitialData(null);
      setIsDeployModalOpen(true);
  };

  // If detailed view is selected
  if (selectedApp) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
             <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="text-blue-500" />
                    <h1 className="text-xl font-bold text-white tracking-tight">BareMetal</h1>
                </div>
            </nav>
            <AppDetails 
                app={selectedApp} 
                onBack={() => setSelectedApp(null)}
                onDelete={handleDelete}
                onEdit={handleEdit}
            />
             <DeployModal 
                isOpen={isDeployModalOpen}
                onClose={() => setIsDeployModalOpen(false)}
                baseDomain={baseDomain}
                onDeploySuccess={() => {
                    fetchApps();
                    // Also refresh the selected app details if we are viewing it
                    if (selectedApp) {
                        // Optimistic update or fetch again.
                        // Simple way: find the updated app in the new list (needs logic) or just close modal.
                        // Actually fetchApps updates the list. We might need to update selectedApp from that list.
                        // For now, simpler to just let the user see the logs update or navigate back.
                        // Ideally, we'd refetch selectedApp.
                        
                        // Let's do a quick fetch for single app or just rely on global refresh.
                        // We will rely on global refresh for now, but to be safe, let's close modal.
                    }
                }}
                initialData={modalInitialData}
            />
        </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-blue-500" />
          <h1 className="text-xl font-bold text-white tracking-tight">BareMetal</h1>
        </div>
        
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 cursor-pointer"
        >
          <Plus size={18} /> New App
        </button>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">System Status</h2>
            <SystemStats />
        </div>

        <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                Deployed Applications 
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{apps.length}</span>
            </h2>
            
            {apps.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No apps deployed yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-6">Get started by deploying your first application to the bare metal infrastructure.</p>
                    <button
                        onClick={handleOpenNew}
                        className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                    >
                        Deploy now &rarr;
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apps.map((app) => (
                        <AppCard 
                            key={app.id || app.name} 
                            app={app} 
                            onClick={setSelectedApp} 
                        />
                    ))}
                </div>
            )}
        </div>
      </main>

      <DeployModal 
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        baseDomain={baseDomain}
        onDeploySuccess={() => {
            fetchApps();
        }}
        initialData={modalInitialData}
      />
    </div>
  );
}

export default AppDashboard;
