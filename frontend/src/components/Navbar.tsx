import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/Button";

interface NavbarProps {
    onOpenNew: () => void;
}

export function Navbar({ onOpenNew }: NavbarProps) {
    return (
        <nav className="bg-iron-950/80 border-b border-iron-800 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
            <Link to="/" className="flex items-center gap-3 group">
                <img src="/BMP.svg" alt="BMP Logo" className="w-10 h-10" />
                <h1 className="text-xl font-display font-bold text-white tracking-widest uppercase">
                    Bare Metal <span className="text-forge-500 text-lg">PaaS</span>
                </h1>
            </Link>

            <div className="flex items-center gap-6 py-4">
                <Button onClick={onOpenNew} variant="primary" size="md" className="flex items-center gap-2">
                    <Plus size={18} /> NEW APP
                </Button>
            </div>
        </nav>
    );
}
