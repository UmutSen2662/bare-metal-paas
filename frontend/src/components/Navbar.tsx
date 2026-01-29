import { LayoutDashboard, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface NavbarProps {
    onOpenNew: () => void;
}

export function Navbar({ onOpenNew }: NavbarProps) {
    return (
        <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <LayoutDashboard className="text-blue-500" />
                <h1 className="text-xl font-bold text-white tracking-tight">BareMetal</h1>
            </Link>

            <button
                onClick={onOpenNew}
                className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 cursor-pointer"
            >
                <Plus size={18} /> New App
            </button>
        </nav>
    );
}
