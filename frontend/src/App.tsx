import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import "./index.css";

import { Navbar } from "./components/Navbar";
import { DeployModal } from "./components/DeployModal";
import type { App } from "./types";

export default function App() {
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<App | null>(null);
    const [baseDomain, setBaseDomain] = useState<string>("paas.local");
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/config");
                if (res.ok) {
                    const data = await res.json();
                    setBaseDomain(data.base_domain);
                }
            } catch (error) {
                console.error("Failed to fetch config", error);
            }
        };
        fetchConfig();
    }, []);

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
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Navbar onOpenNew={openNewAppModal} />

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
        </div>
    );
}
