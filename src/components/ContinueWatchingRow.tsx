import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IMG, title } from "../api/tmdb";
import { useStore, type WatchProgress } from "../store/useStore";
import LazyImage from "./LazyImage";
import { Play, Close } from "./icons";

export default function ContinueWatchingRow({
  items,
}: {
  items: WatchProgress[];
}) {
  const navigate = useNavigate();
  const { removeProgress } = useStore();

  return (
    <section className="my-8">
      <div className="mb-3 flex items-center gap-3 px-4 md:px-10">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
        <h2 className="text-lg font-bold tracking-tight md:text-xl">
          Continue Watching
        </h2>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-4 md:px-10">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
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
                {item.media_type === "tv" && item.season && (
                  <p className="text-xs text-zinc-400">
                    S{item.season} · E{item.episode}
                  </p>
                )}
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-white/20">
                <div
                  className="h-full bg-violet-500"
                  style={{ width: `${item.progress || 5}%` }}
                />
              </div>
            </button>
            <button
              onClick={() => removeProgress(item.id)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 opacity-0 transition group-hover:opacity-100"
            >
              <Close width={14} height={14} />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
