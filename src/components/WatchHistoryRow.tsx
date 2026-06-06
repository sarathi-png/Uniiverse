import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IMG, title } from "../api/tmdb";
import { useStore, type HistoryItem } from "../store/useStore";
import LazyImage from "./LazyImage";
import { Play, Close, Clock } from "./icons";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function WatchHistoryRow({ items }: { items: HistoryItem[] }) {
  const navigate = useNavigate();
  const { removeFromHistory } = useStore();

  return (
    <section className="my-8">
      <div className="mb-3 flex items-center gap-3 px-4 md:px-10">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-violet-400 to-indigo-500" />
        <h2 className="text-lg font-bold tracking-tight md:text-xl">
          Watch History
        </h2>
        <span className="text-sm text-zinc-500">({items.length})</span>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-4 md:px-10">
        {items.map((item, i) => {
          const pct = item.progress ?? 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group relative w-[280px] shrink-0"
            >
              <button
                onClick={() => navigate(`/watch/${item.media_type}/${item.id}`)}
                className="relative block aspect-video w-full overflow-hidden rounded-xl ring-1 ring-white/5"
              >
                <LazyImage
                  src={IMG.backdrop(item.backdrop_path, "w780")}
                  fallbackText={title(item)}
                  alt={title(item)}
                  className="h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
                    <Play width={22} height={22} />
                  </span>
                </div>
                <div className="absolute bottom-2 left-3 right-3">
                  <p className="truncate text-sm font-semibold">{title(item)}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
                    {pct > 0 && <span>{pct}% watched</span>}
                    {pct > 0 && <span>·</span>}
                    <span className="flex items-center gap-1">
                      <Clock width={10} height={10} />
                      {timeAgo(item.watchedAt)}
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-white/20">
                  <div
                    className="h-full bg-violet-500 transition-all"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  />
                </div>
              </button>
              <button
                onClick={() => removeFromHistory(item.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/80"
                title="Remove from history"
              >
                <Close width={14} height={14} />
              </button>
            </motion.div>
          );
        })}
      </div>
      {items.length === 0 && (
        <p className="px-4 text-sm text-zinc-600 md:px-10">
          Nothing watched yet — start browsing and your history will appear here.
        </p>
      )}
    </section>
  );
}
