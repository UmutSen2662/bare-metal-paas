import { Github, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface NavbarProps {
  onOpenSettings: () => void;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  return (
    <nav className="bg-iron-950/80 border-b border-iron-800 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-3 group py-4 hover:drop-shadow-forge-lg group">
        <img
          src="/BMP-Clear.svg"
          alt="BMP Logo"
          className="w-10 h-10 group-hover:drop-shadow-forge-lg"
        />
        <h1 className="text-xl font-display font-bold text-white tracking-widest uppercase">
          Bare Metal <span className="text-forge-500 text-lg">PaaS</span>
        </h1>
      </Link>

      <div className="flex items-center gap-4">
        <a
          href="https://github.com/UmutSen2662/bare-metal-paas"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-iron-800 rounded-lg text-slate-400 hover:text-white transition-all group cursor-pointer"
          title="GitHub Repository"
        >
          <Github size={20} />
        </a>
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 hover:bg-iron-800 rounded-lg text-slate-400 hover:text-white transition-all group cursor-pointer"
          title="System Settings"
        >
          <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>
    </nav>
  );
}
