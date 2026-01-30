import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import "./index.css";

import { Navbar } from "./components/Navbar";
import { DeployModal } from "./components/DeployModal";
import { SettingsModal } from "./components/SettingsModal";
import type { App } from "./types";

export default function App() {
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<App | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const { data: config } = useQuery({
        queryKey: ["config"],
        queryFn: async () => {
            const res = await fetch("/api/config");
            if (!res.ok) throw new Error("Failed to fetch config");
            return res.json();
        },
        staleTime: Infinity,
    });

    const baseDomain = config?.base_domain || "paas.local";

    const openNewAppModal = () => {
        setModalInitialData(null);
        setIsDeployModalOpen(true);
    };

    const openEditAppModal = (app: App) => {
        setModalInitialData(app);
        setIsDeployModalOpen(true);
    };

    const handleDeploySuccess = () => {
        // Increment trigger to notify children to refetch
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <div className="min-h-screen w-full bg-iron-950 text-slate-300 font-sans selection:bg-forge-500 selection:text-white">
            <Navbar onOpenSettings={() => setIsSettingsModalOpen(true)} />

            {/* 
          Outlet context allows us to pass functions down to pages 
          without prop drilling through the router.
      */}
            <Outlet context={{ openNewAppModal, openEditAppModal, refreshTrigger }} />

            <DeployModal
                isOpen={isDeployModalOpen}
                onClose={() => setIsDeployModalOpen(false)}
                baseDomain={baseDomain}
                onDeploySuccess={handleDeploySuccess}
                initialData={modalInitialData}
            />

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
            />
        </div>
    );
}
