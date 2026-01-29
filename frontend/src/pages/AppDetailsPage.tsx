import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import type { App } from "../types";
import { AppDetails } from "../components/AppDetails";

interface DetailsContext {
    openEditAppModal: (app: App) => void;
    refreshTrigger: number;
}

export default function AppDetailsPage() {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const { openEditAppModal, refreshTrigger } = useOutletContext<DetailsContext>();

    const [app, setApp] = useState<App | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchApp = async () => {
            if (!name) return;
            try {
                setLoading(true);
                const res = await fetch(`/api/apps/${name}`);
                if (res.ok) {
                    const data = await res.json();
                    setApp(data);
                    setError(null);
                } else {
                    setError("App not found");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch app details");
            } finally {
                setLoading(false);
            }
        };

        fetchApp();
    }, [name, refreshTrigger]);

    const handleDelete = async (appName: string) => {
        if (!confirm(`Are you sure you want to delete ${appName}? This action is irreversible.`)) return;

        try {
            const res = await fetch(`/api/apps/${appName}`, { method: "DELETE" });
            if (res.ok) {
                navigate("/");
            } else {
                alert("Failed to delete app");
            }
        } catch (error) {
            console.error("Failed to delete app", error);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading app details...</div>;
    if (error || !app) return <div className="p-8 text-center text-red-500">{error || "App not found"}</div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <AppDetails app={app} onDelete={handleDelete} onEdit={openEditAppModal} />
        </div>
    );
}
