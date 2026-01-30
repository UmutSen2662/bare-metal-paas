import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, Download, Upload, FileJson, CheckCircle2, X, Save } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [baseDomain, setBaseDomain] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: config, isLoading } = useQuery({
        queryKey: ["config"],
        queryFn: async () => {
            const res = await fetch("/api/config");
            if (!res.ok) throw new Error("Failed to fetch config");
            return res.json();
        },
        enabled: isOpen,
    });

    useEffect(() => {
        if (config?.base_domain) {
            setBaseDomain(config.base_domain);
        }
    }, [config]);

    const handleUpdateDomain = async () => {
        console.log("Updating base domain to:", baseDomain);
        // API call will go here
    };

    const handleExport = async () => {
        console.log("Triggering export...");
        // API call will go here
    };

    const validateFile = async (file: File): Promise<boolean> => {
        console.log("Validating file:", file.name);
        // Backend validation check will go here
        return true;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const isValid = await validateFile(file);
            if (isValid) setSelectedFile(file);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const isValid = await validateFile(file);
            if (isValid) setSelectedFile(file);
        }
    };

    const handleRestore = async () => {
        if (!selectedFile) return;
        console.log("Restoring system from:", selectedFile);
        // API call will go here
    };

    const validateDomainName = (domain: string) => {
        if (!domain) return false;
        // Basic domain regex: alphanumeric, dots, hyphens. No spaces.
        const regex = /^[a-zA-Z0-9][a-zA-Z0-9-.]*[a-zA-Z0-9]$/;
        return regex.test(domain) && !domain.includes(" ");
    };

    const isValidDomain = validateDomainName(baseDomain);
    const isDomainChanged = baseDomain !== (config?.base_domain || "");

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <>
                    <Settings className="text-forge-500" />
                    System Settings
                </>
            }
            maxWidth="xl"
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-8 h-8 border-2 border-forge-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-mono text-sm animate-pulse">Loading platform configuration...</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* General Config */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-forge-500 rounded-full" />
                            General Configuration
                        </h3>
                        <div className="p-4 bg-iron-950 border border-iron-800 rounded-lg flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Input
                                            label="Base App Domain"
                                            value={baseDomain}
                                            onChange={(e) => setBaseDomain(e.target.value)}
                                            placeholder="paas.local"
                                            className={
                                                !isValidDomain && baseDomain !== ""
                                                    ? "border-red/50 focus:border-red"
                                                    : ""
                                            }
                                        />
                                    </div>
                                    <Button
                                        size="md"
                                        variant="primary"
                                        className="mb-0.5 px-6"
                                        disabled={!isDomainChanged || !isValidDomain}
                                        onClick={handleUpdateDomain}
                                    >
                                        <Save size={16} className="mr-2" />
                                        Update
                                    </Button>
                                </div>
                                {!isValidDomain && baseDomain !== "" && (
                                    <span className="text-xs text-red font-mono ml-1 mt-1">
                                        Invalid domain format. Use alphanumeric, dots, and hyphens only.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Backup & Restore Section */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-forge-500 rounded-full" />
                            Backup & Restore
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Export */}
                            <div className="p-5 bg-iron-950 border border-iron-800 rounded-lg flex flex-col gap-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200 mb-1">Export Configuration</h4>
                                    <p className="text-xs text-slate-500">
                                        Download a full snapshot of your system configuration, including all apps and
                                        settings.
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    className="w-full gap-2 border-iron-700 hover:border-forge-500"
                                    onClick={handleExport}
                                >
                                    <Download size={16} />
                                    Export JSON
                                </Button>
                            </div>

                            {/* Import */}
                            <div className="p-5 bg-iron-950 border border-iron-800 rounded-lg flex flex-col gap-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200 mb-1">Restore System</h4>
                                    <p className="text-xs text-slate-500">
                                        Upload a previously exported JSON configuration to restore system state.
                                    </p>
                                </div>

                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                                        relative group cursor-pointer
                                        border-2 border-dashed rounded-lg p-4
                                        transition-all duration-200 flex flex-col items-center justify-center gap-2
                                        ${
                                            isDragging
                                                ? "border-forge-500 bg-forge-500/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                                                : "border-iron-800 hover:border-iron-700 bg-iron-900/50"
                                        }
                                        ${selectedFile ? "border-emerald-500/50 bg-emerald-500/5" : ""}
                                    `}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".json"
                                        className="hidden"
                                    />

                                    {!selectedFile ? (
                                        <>
                                            <Upload
                                                size={20}
                                                className={`transition-colors ${
                                                    isDragging
                                                        ? "text-forge-500"
                                                        : "text-slate-500 group-hover:text-slate-400"
                                                }`}
                                            />
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 text-center">
                                                {isDragging ? "Drop to load" : "Drop config or click"}
                                            </span>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 w-full">
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <FileJson size={18} />
                                                <span className="text-[11px] font-mono font-bold truncate max-w-[120px]">
                                                    {selectedFile.name}
                                                </span>
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile(null);
                                                }}
                                                className="text-[9px] text-slate-500 hover:text-red-400 flex items-center gap-1 mt-1 transition-colors"
                                            >
                                                <X size={10} /> Change File
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="primary"
                                    className="w-full gap-2 mt-auto"
                                    disabled={!selectedFile}
                                    onClick={handleRestore}
                                >
                                    <Upload size={16} />
                                    Restore System
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
