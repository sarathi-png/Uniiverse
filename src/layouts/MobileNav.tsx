import { Link, useLocation } from "react-router-dom";
import { Home, Film, Tv, Compass, Bookmark } from "../components/icons";

export default function MobileNav() {
  const loc = useLocation();
  const items = [
    { to: "/", label: "Home", Icon: Home },
    { to: "/browse/movie", label: "Movies", Icon: Film },
    { to: "/browse/tv", label: "TV", Icon: Tv },
    { to: "/explore", label: "Explore", Icon: Compass },
    { to: "/watchlist", label: "List", Icon: Bookmark },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] glass-strong md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map(({ to, label, Icon }) => {
          const active = loc.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-medium transition ${
                active ? "text-violet-400" : "text-zinc-500"
              }`}
            >
              <Icon width={22} height={22} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
