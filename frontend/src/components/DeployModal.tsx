import { useState, useEffect } from "react";
import { Plus, Box, Play, Terminal, Search, ChevronDown, ChevronUp, Layers, Edit2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import presetsData from "../presets.json";
import languagesData from "../languages.json";
import type { App } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

// Simple Icon Mapper
const ICON_MAP: Record<string, React.ElementType> = {
    Box,
    Terminal,
    Play,
    Layers,
};

interface DeployModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseDomain: string;
    onDeploySuccess: () => void;
    initialData?: App | null;
}

export function DeployModal({ isOpen, onClose, baseDomain, onDeploySuccess, initialData }: DeployModalProps) {
    const [useCustomDomain, setUseCustomDomain] = useState(false);

    // Preset UI State
    const [isPresetsOpen, setIsPresetsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const defaultPreset = presetsData.find((p) => p.id === "node")?.config || {
        language_version: "node@24",
        build_command: "npm install && npm run build",
        start_command: "npm start",
    };

    const [formData, setFormData] = useState({
        name: "",
        repo_url: "",
        domain: "",
        ...defaultPreset,
    });

    const deployMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/deploy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const responseData = await res.json();
            if (!res.ok) {
                throw new Error(responseData.detail || "Deployment failed");
            }
            return responseData;
        },
        onSuccess: () => {
            onDeploySuccess();
            onClose();
        },
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
            setUseCustomDomain(!initialData.domain.endsWith(baseDomain));
        } else if (isOpen && !initialData) {
            // Reset
            setFormData({
                name: "",
                repo_url: "",
                domain: "",
                ...defaultPreset,
            });
            setUseCustomDomain(false);
            deployMutation.reset(); // Clear previous errors
        }
    }, [isOpen, initialData, baseDomain]);

    const applyPreset = (presetId: string) => {
        const preset = presetsData.find((p) => p.id === presetId);
        if (!preset) return;

        setFormData((prev) => ({
            ...prev,
            ...preset.config,
        }));
        setIsPresetsOpen(false); // Close after selection
    };

    const filteredPresets = presetsData.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check for destructive changes (Repo URL or Language Version)
        const isRepoChanged = isEditing && initialData && formData.repo_url !== initialData.repo_url;
        const isLangChanged = isEditing && initialData && formData.language_version !== initialData.language_version;

        if (isRepoChanged || isLangChanged) {
            const reason = isRepoChanged ? "Repository URL" : "Language Version";
            const confirmed = confirm(
                `WARNING: You are changing the ${reason}. This will perform a full directory wipe on the server to ensure a clean environment. Any local data (like PocketBase pb_data, node_modules, or uploads) will be permanently deleted. Are you sure you want to proceed?`,
            );
            if (!confirmed) return;
        }

        let finalDomain = formData.domain;

        if (!useCustomDomain) {
            if (!formData.domain.includes(baseDomain)) {
                finalDomain = `${formData.domain}.${baseDomain}`;
            }
        }

        deployMutation.mutate({ ...formData, domain: finalDomain });
    };

    const isEditing = !!initialData;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <>
                    {isEditing ? <Edit2 className="text-forge-500" /> : <Plus className="text-forge-500" />}
                    {isEditing ? "Update Application" : "Deploy New App"}
                </>
            }
        >
            {deployMutation.isError && (
                <div className="mb-6 p-4 bg-red/20 text-red rounded-lg text-sm border border-red/50 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse"></div>
                    {deployMutation.error.message}
                </div>
            )}

            {!isEditing && (
                <div className="mb-8 border border-iron-800 rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                        className="w-full flex items-center justify-between p-4 bg-iron-950 hover:bg-iron-800/80 transition-colors text-slate-300 font-medium cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <Layers size={18} className="text-forge-500" />
                            <span>Quick Configuration Presets</span>
                        </div>
                        {isPresetsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {isPresetsOpen && (
                        <div className="p-4 bg-iron-900 border-t border-iron-800">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                                <Input
                                    type="text"
                                    placeholder="Search presets (e.g., Python, React)..."
                                    className="pl-9 bg-iron-950 text-white placeholder-slate-600"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {filteredPresets.map((preset) => {
                                    const Icon = ICON_MAP[preset.icon] || Box;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => applyPreset(preset.id)}
                                            className="flex items-start gap-3 p-3 text-left border border-iron-800 rounded-lg hover:border-forge-500 hover:bg-iron-800 transition-all group cursor-pointer"
                                        >
                                            <div className="mt-1 text-slate-600 group-hover:text-forge-500 transition-colors">
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 text-sm group-hover:text-white">
                                                    {preset.name}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {preset.description}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {filteredPresets.length === 0 && (
                                    <div className="col-span-2 text-center text-slate-600 py-4 text-sm font-mono">
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
                        <Input
                            label="App Name"
                            type="text"
                            required
                            disabled={isEditing}
                            className={`${isEditing ? "bg-iron-800 border-iron-700 text-slate-500 cursor-not-allowed" : ""}`}
                            placeholder="my-app"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        {isEditing && <p className="text-xs text-slate-600 mt-2 font-mono">ID cannot be changed.</p>}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mt-1 mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                                Domain
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="useCustomDomain"
                                    className="w-3.5 h-3.5 text-forge-600 rounded focus:ring-forge-500 bg-iron-950 border-iron-700 accent-forge-500"
                                    checked={useCustomDomain}
                                    onChange={(e) => setUseCustomDomain(e.target.checked)}
                                />
                                <label
                                    htmlFor="useCustomDomain"
                                    className="text-xs text-slate-400 cursor-pointer select-none hover:text-white"
                                >
                                    Custom
                                </label>
                            </div>
                        </div>

                        {!useCustomDomain ? (
                            <div className="flex">
                                <Input
                                    type="text"
                                    required
                                    className="rounded-r-none border-r-0 text-right pr-1"
                                    placeholder="subdomain"
                                    value={formData.domain.replace(`.${baseDomain}`, "")}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                />
                                <span className="inline-flex items-center px-3 rounded-r-md bg-iron-800 text-slate-400 text-sm font-mono">
                                    .{baseDomain}
                                </span>
                            </div>
                        ) : (
                            <div className="flex">
                                <Input
                                    type="text"
                                    required
                                    placeholder="myapp.com"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <Input
                    label="Git Repository URL"
                    icon={
                        <svg
                            className="h-5"
                            role="img"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <title>GitHub</title>
                            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                    }
                    type="text"
                    required
                    placeholder="https://github.com/user/repo.git"
                    value={formData.repo_url}
                    onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                            Language & Version
                        </label>
                        <div className="relative">
                            <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                            <select
                                className="w-full p-3 pl-10 border border-iron-800 bg-iron-950 text-slate-200 rounded-md focus:ring-1 focus:ring-forge-500 focus:border-forge-500 outline-none appearance-none font-mono text-sm transition-all"
                                value={formData.language_version}
                                onChange={(e) => setFormData({ ...formData, language_version: e.target.value })}
                            >
                                {languagesData.map((lang) => (
                                    <option key={lang.id} value={lang.value}>
                                        {lang.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
                                size={16}
                            />
                        </div>
                    </div>

                    <Input
                        label={formData.language_version.includes("static") ? "Directory" : "Start Command"}
                        icon={<Play size={20} />}
                        type="text"
                        required
                        placeholder="npm start"
                        value={formData.start_command}
                        onChange={(e) => setFormData({ ...formData, start_command: e.target.value })}
                    />
                </div>

                <Input
                    label="Build Command"
                    icon={<Terminal size={20} />}
                    type="text"
                    placeholder="npm install && npm run build"
                    value={formData.build_command}
                    onChange={(e) => setFormData({ ...formData, build_command: e.target.value })}
                />

                <Button
                    type="submit"
                    disabled={deployMutation.isPending}
                    variant="primary"
                    size="lg"
                    className="w-full"
                >
                    {deployMutation.isPending ? (
                        <>
                            <span className="animate-spin h-5 w-5 border-2 border-b-transparent border-white rounded-full mr-2"></span>
                            {isEditing ? "INITIALIZING UPDATE..." : "INITIATING DEPLOYMENT..."}
                        </>
                    ) : (
                        <>{isEditing ? "UPDATE CONFIGURATION" : "LAUNCH APPLICATION"}</>
                    )}
                </Button>
            </form>
        </Modal>
    );
}
