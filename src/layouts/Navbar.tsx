import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Bookmark, Sparkle } from "../components/icons";
import { useStore } from "../store/useStore";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();
  const adultEnabled = useStore((s) => s.adultContentEnabled);
  const setAdultEnabled = useStore((s) => s.setAdultContentEnabled);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/", label: "Home" },
    { to: "/browse/movie", label: "Movies" },
    { to: "/browse/tv", label: "TV Shows" },
    { to: "/browse/tamil-dubbed", label: "Tamil Dubbed" },
    ...(adultEnabled ? [{ to: "/browse/vivamax", label: "Vivamax" }] : []),
    { to: "/explore", label: "Explore" },
    { to: "/watchlist", label: "My List" },
  ];

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed inset-x-0 top-0 z-[60] transition-all duration-500 ${
        scrolled ? "glass-strong" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 items-center gap-6 px-4 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 neon-border">
            <Sparkle width={20} height={20} className="text-white" />
          </div>
          <span className="hidden text-xl font-black tracking-tight text-glow sm:block">
            NOVA<span className="text-violet-400">STREAM</span>
          </span>
        </Link>

        <button
          onClick={() => setAdultEnabled(!adultEnabled)}
          className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition md:flex ${
            adultEnabled
              ? "bg-violet-600/50 text-violet-200 ring-1 ring-violet-500/50"
              : "bg-white/5 text-zinc-500 hover:text-zinc-300"
          }`}
          title="Toggle adult content"
        >
          <span className={`inline-block h-3 w-3 rounded-full border transition ${
            adultEnabled
              ? "border-violet-300 bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]"
              : "border-zinc-600 bg-zinc-700"
          }`} />
          A content
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = loc.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate("/search")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Search"
          >
            <Search width={20} height={20} />
          </button>
          <Link
            to="/watchlist"
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Watchlist"
          >
            <Bookmark width={20} height={20} />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-pink-500 text-sm font-bold text-black">
            N
          </div>
        </div>
      </div>
    </motion.header>
  );
}
