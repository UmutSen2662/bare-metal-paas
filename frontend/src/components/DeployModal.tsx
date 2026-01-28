import { useState, useEffect } from 'react';
import { Plus, X, Github, Box, Play, Terminal, Search, ChevronDown, ChevronUp, Layers, Edit2 } from 'lucide-react';
import presetsData from '../presets.json';
import languagesData from '../languages.json';
import type { App } from '../types';

// Simple Icon Mapper
const ICON_MAP: Record<string, any> = {
    Box, Terminal, Play, Layers
};

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseDomain: string;
  onDeploySuccess: () => void;
  initialData?: App | null;
}

export function DeployModal({ isOpen, onClose, baseDomain, onDeploySuccess, initialData }: DeployModalProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomDomain, setUseCustomDomain] = useState(false);

  // Preset UI State
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    repo_url: '',
    domain: '',
    language_version: 'node@20',
    build_command: 'npm install && npm run build',
    start_command: 'npm start',
  });

  // Load initial data for editing
  useEffect(() => {
    if (isOpen && initialData) {
        setFormData({
            name: initialData.name,
            repo_url: initialData.repo_url,
            domain: initialData.domain,
            language_version: initialData.language_version,
            build_command: initialData.build_command,
            start_command: initialData.start_command,
        });
        
        // Determine if it was a custom domain
        // Heuristic: if it doesn't end with baseDomain, it's likely custom
        // or if user manually set it.
        // Simplified check:
        setUseCustomDomain(!initialData.domain.endsWith(baseDomain));
    } else if (isOpen && !initialData) {
        // Reset
        setFormData({
            name: '',
            repo_url: '',
            domain: '',
            language_version: 'node@20',
            build_command: 'npm install && npm run build',
            start_command: 'npm start',
        });
        setUseCustomDomain(false);
    }
  }, [isOpen, initialData, baseDomain]);


  const applyPreset = (presetId: string) => {
    const preset = presetsData.find(p => p.id === presetId);
    if (!preset) return;

    setFormData(prev => ({
        ...prev,
        ...preset.config
    }));
    setIsPresetsOpen(false); // Close after selection
  };

  const filteredPresets = presetsData.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setError(null);

    // If editing and using subdomains, we need to be careful not to double-append
    // But formData.domain usually stores the *input* part in "New" mode.
    // In "Edit" mode, we populated it with the FULL domain.
    
    let finalDomain = formData.domain;

    if (!useCustomDomain) {
        // Subdomain logic
        // If we are editing, formData.domain might be "app.base.com" or just "app" depending on how we want to handle it.
        // For simplicity: In Edit mode, we assume the user might edit the whole string or we strip it.
        // Let's refine the Edit logic above.
        // BETTER APPROACH: In Edit mode, if it matches baseDomain, strip it for the input.
        
        // Wait, to avoid complexity, let's just always submit what's in the box if custom, 
        // or append if not.
        if (!formData.domain.includes(baseDomain)) {
             finalDomain = `${formData.domain}.${baseDomain}`;
        }
    }

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, domain: finalDomain }),
      });

      const data = await res.json();

      if (res.ok) {
        onDeploySuccess(); // This will trigger a refresh in parent
        onClose();
      } else {
        setError(data.detail || 'Deployment failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeploying(false);
    }
  };
  
  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {isEditing ? <Edit2 className="text-blue-600" /> : <Plus className="text-blue-600" />} 
            {isEditing ? 'Update Application' : 'Deploy New App'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {!isEditing && (
            <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
                <button 
                    type="button"
                    onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 font-medium"
                >
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-blue-500" />
                        <span>Quick Configuration Presets</span>
                    </div>
                    {isPresetsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {isPresetsOpen && (
                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search presets (e.g., Python, React)..."
                                className="w-full pl-9 p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {filteredPresets.map(preset => {
                                const Icon = ICON_MAP[preset.icon] || Box;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => applyPreset(preset.id)}
                                        className="flex items-start gap-3 p-3 text-left border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="mt-1 text-slate-400 group-hover:text-blue-500">
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800 text-sm">{preset.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredPresets.length === 0 && (
                                <div className="col-span-2 text-center text-slate-500 py-4 text-sm">
                                    No presets found matching "{searchQuery}"
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">App Name</label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    className={`w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                    placeholder="my-app"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {isEditing && <p className="text-xs text-slate-500 mt-1">App name cannot be changed.</p>}
                </div>
                
                <div>
                   <div className="flex justify-between items-center mb-1">
                     <label className="block text-sm font-medium text-slate-700">Domain</label>
                     <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="useCustomDomain"
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            checked={useCustomDomain}
                            onChange={(e) => setUseCustomDomain(e.target.checked)}
                        />
                        <label htmlFor="useCustomDomain" className="text-xs text-slate-500 cursor-pointer select-none">
                            Custom
                        </label>
                     </div>
                   </div>
                   
                   {!useCustomDomain ? (
                        <div className="flex">
                            <input
                                type="text"
                                required
                                className="flex-1 w-full p-2.5 border border-r-0 border-slate-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-right pr-1"
                                placeholder="subdomain"
                                value={formData.domain.replace(`.${baseDomain}`, '')}
                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            />
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-100 text-slate-600 text-sm font-medium">
                                .{baseDomain}
                            </span>
                        </div>
                   ) : (
                        <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">http://</span>
                            <input
                                type="text"
                                required
                                className="flex-1 w-full p-2.5 border border-slate-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="myapp.com"
                                value={formData.domain}
                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            />
                        </div>
                   )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Git Repository URL</label>
                <div className="relative">
                    <Github className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        required
                        className="w-full p-2.5 pl-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="https://github.com/user/repo.git"
                        value={formData.repo_url}
                        onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Language & Version</label>
                    <div className="relative">
                        <Box className="absolute left-3 top-3 text-slate-400" size={18} />
                        <select
                            className="w-full p-2.5 pl-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            value={formData.language_version}
                            onChange={(e) => setFormData({ ...formData, language_version: e.target.value })}
                        >
                            {languagesData.map((lang) => (
                                <option key={lang.id} value={lang.value}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Command</label>
                    <div className="relative">
                        <Play className="absolute left-3 top-3 text-slate-400" size={18} />
                         <input
                            type="text"
                            required
                            className="w-full p-2.5 pl-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="npm start"
                            value={formData.start_command}
                            onChange={(e) => setFormData({ ...formData, start_command: e.target.value })}
                        />
                    </div>
                 </div>
            </div>

            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Build Command</label>
                 <div className="relative">
                    <Terminal className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        className="w-full p-2.5 pl-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                        placeholder="npm install && npm run build"
                        value={formData.build_command}
                        onChange={(e) => setFormData({ ...formData, build_command: e.target.value })}
                    />
                 </div>
            </div>

            <button
                type="submit"
                disabled={isDeploying}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer mt-4"
            >
                {isDeploying ? (
                    <>
                        <span className="animate-spin h-5 w-5 border-2 border-b-transparent border-white rounded-full"></span>
                        {isEditing ? 'Updating...' : 'Deploying...'}
                    </>
                ) : (
                    <>{isEditing ? 'Update Application' : 'Deploy Application'}</>
                )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
