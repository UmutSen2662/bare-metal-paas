import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { App } from "../types";
import { AppDetails } from "../components/AppDetails";

interface DetailsContext {
    openEditAppModal: (app: App) => void;
    refreshTrigger: number;
}

export default function AppDetailsPage() {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { openEditAppModal } = useOutletContext<DetailsContext>();

    // Initial Fetch (sets up the cache for AppDetails to reuse)
    const { data: app, isLoading, isError, error } = useQuery<App>({
        queryKey: ["app", name],
        queryFn: async () => {
            if (!name) throw new Error("No app name provided");
            const res = await fetch(`/api/apps/${name}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("App not found");
                throw new Error("Failed to fetch app details");
            }
            return res.json();
        },
        retry: 1,
    });

    const deleteMutation = useMutation({
        mutationFn: async (appName: string) => {
            const res = await fetch(`/api/apps/${appName}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete app");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["apps"] });
            navigate("/");
        },
        onError: (err) => {
            console.error("Failed to delete app", err);
            alert("Failed to delete app");
        },
    });

    const handleDelete = (appName: string) => {
        if (!confirm(`Are you sure you want to delete ${appName}? This action is irreversible.`)) return;
        deleteMutation.mutate(appName);
    };

    if (isLoading)
        return <div className="p-8 text-center text-slate-500 font-mono animate-pulse">Scanning frequencies...</div>;
    
    if (isError || !app)
        return (
            <div className="p-8 text-center text-status-error font-mono border border-status-error/20 bg-status-error/10 rounded m-8">
                {error?.message || "Target not found"}
            </div>
        );

    return (
        <div className="min-h-screen">
            <AppDetails app={app} onDelete={handleDelete} onEdit={openEditAppModal} />
        </div>
    );
}
