import { LayoutDashboard, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface NavbarProps {
    onOpenNew: () => void;
}

export function Navbar({ onOpenNew }: NavbarProps) {
    return (
        <nav className="bg-iron-950/80 border-b border-iron-800 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
            <Link to="/" className="flex items-center gap-3 group">
                <div className="p-1.5 bg-iron-900 border border-iron-700 rounded-md group-hover:border-forge-500 group-hover:shadow-[0_0_10px_rgba(249,115,22,0.2)] transition-all duration-300">
                    <LayoutDashboard className="text-forge-500" size={20} />
                </div>
                <h1 className="text-xl font-display font-bold text-white tracking-widest uppercase">
                    Bare Metal <span className="text-forge-500">PaaS</span>
                </h1>
            </Link>

            <button
                onClick={onOpenNew}
                className="my-6 bg-forge-500 hover:bg-forge-600 text-white font-display font-bold py-1.5 px-4 rounded transition-all duration-200 flex items-center gap-2 shadow-lg shadow-orange-900/20 hover:shadow-orange-900/40 cursor-pointer"
            >
                <Plus size={18} /> NEW APP
            </button>
        </nav>
    );
}
