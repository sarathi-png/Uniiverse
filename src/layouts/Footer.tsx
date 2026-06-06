import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#020202] px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-white">
            NOVA<span className="text-violet-500">STREAM</span>
          </span>
          <span className="text-[11px] text-zinc-600">&copy; {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-zinc-500">
          <Link to="/dmca" className="transition hover:text-zinc-300">
            DMCA
          </Link>
          <Link to="/privacy" className="transition hover:text-zinc-300">
            Privacy
          </Link>
          <Link to="/terms" className="transition hover:text-zinc-300">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
