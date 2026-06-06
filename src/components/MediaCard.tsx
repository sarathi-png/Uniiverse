import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IMG,
  title,
  year,
  mediaTypeOf,
  type MediaItem,
  tmdbApi,
} from "../api/tmdb";
import { useStore } from "../store/useStore";
import LazyImage from "./LazyImage";
import { Play, PlusIcon, Check, Star, Info } from "./icons";
import { getCertification } from "./ContentRatingBadge";
import { useCardModal } from "./CardModalProvider";

interface Props {
  item: MediaItem;
  index?: number;
  rank?: number;
}

export default function MediaCard({ item, rank }: Props) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { toggleWatchlist, inWatchlist } = useStore();
  const type = mediaTypeOf(item);
  const saved = inWatchlist(item.id);
  const { openCardModal } = useCardModal();

  const open = () => navigate(`/title/${type}/${item.id}`);
  const watch = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/watch/${type}/${item.id}`);
  };

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [certification, setCertification] = useState<string | null>(null);

  const onEnter = () => {
    timer.current = setTimeout(async () => {
      setHover(true);
      try {
        const details = await tmdbApi.details(type, item.id);
        const trailer = details.videos?.results?.find(
          (v: any) => v.type === "Trailer" && v.site === "YouTube"
        );
        if (trailer) setTrailerKey(trailer.key);
        setCertification(getCertification(details, type));
      } catch (e) {
        // fail silently if trailer fetch fails
      }
    }, 450);
  };
  
  const onLeave = () => {
    clearTimeout(timer.current);
    setHover(false);
    setTrailerKey(null);
    setCertification(null);
  };

  return (
    <div
      className="relative shrink-0"
      style={{ width: rank ? 230 : 168 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="flex items-end">
        {rank && (
          <span
            className="-mr-5 select-none text-[110px] font-black leading-none text-transparent"
            style={{
              WebkitTextStroke: "2px rgba(139,92,246,0.5)",
            }}
          >
            {rank}
          </span>
        )}
        <button
          onClick={open}
          className="group relative aspect-[2/3] w-[168px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/5 transition-transform duration-300 hover:ring-violet-500/40"
        >
          <LazyImage
            src={IMG.poster(item.poster_path)}
            fallbackText={title(item)}
            alt={title(item)}
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>

      {/* Hover popup */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={open}
            className="absolute -left-6 -top-6 z-50 hidden w-72 cursor-pointer overflow-hidden rounded-2xl glass-strong shadow-2xl shadow-black/70 md:block"
          >
            <div className="relative aspect-video w-full bg-black">
              {trailerKey ? (
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&showinfo=0`}
                  title="Trailer"
                  allow="autoplay; encrypted-media"
                  className="absolute inset-0 h-[120%] w-[120%] -top-[10%] -left-[10%] pointer-events-none scale-105"
                  style={{ border: 'none' }}
                />
              ) : (
                <LazyImage
                  src={
                    IMG.backdrop(item.backdrop_path, "w780") ||
                    IMG.poster(item.poster_path)
                  }
                  fallbackText={title(item)}
                  alt={title(item)}
                  className="h-full w-full"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-black/20 to-transparent" />
              <h4 className="absolute bottom-2 left-3 right-3 truncate text-sm font-bold drop-shadow-md text-white">
                {title(item)}
              </h4>
            </div>
            <div className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={watch}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
                >
                  <Play width={18} height={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlist({ ...item, media_type: type });
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 transition hover:border-white"
                >
                  {saved ? (
                    <Check width={16} height={16} className="text-emerald-400" />
                  ) : (
                    <PlusIcon width={16} height={16} />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCardModal(item);
                  }}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/25 transition hover:border-white"
                >
                  <Info width={16} height={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <Star width={12} height={12} />
                  {item.vote_average?.toFixed(1) || "—"}
                </span>
                <span className="text-zinc-500">•</span>
                <span>{year(item)}</span>
                {certification && (
                  <>
                    <span className="text-zinc-500">•</span>
                    <span className={`rounded border px-1.5 text-[10px] font-bold ${
                      {
                        G: "border-green-500/30 text-green-400",
                        PG: "border-blue-500/30 text-blue-400",
                        "PG-13": "border-yellow-500/30 text-yellow-400",
                        R: "border-red-500/30 text-red-400",
                        "NC-17": "border-red-600/30 text-red-500",
                        "TV-Y": "border-green-500/30 text-green-400",
                        "TV-Y7": "border-green-600/30 text-green-400",
                        "TV-G": "border-blue-500/30 text-blue-400",
                        "TV-PG": "border-yellow-500/30 text-yellow-400",
                        "TV-14": "border-orange-500/30 text-orange-400",
                        "TV-MA": "border-red-500/30 text-red-400",
                      }[certification] || "border-white/20 text-white/60"
                    }`}>
                      {certification}
                    </span>
                  </>
                )}
                <span className="text-zinc-500">•</span>
                <span className="rounded border border-white/20 px-1.5 text-[10px] uppercase">
                  {type === "tv" ? "Series" : "Film"}
                </span>
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
                {item.overview || "No description available."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
