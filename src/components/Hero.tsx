import { useEffect, useState, useRef } from "react";
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
import { Play, PlusIcon, Check, Star, Info, Volume, Mute } from "./icons";
import { useCardModal } from "./CardModalProvider";

export default function Hero({ items }: { items: MediaItem[] }) {
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videoKeys, setVideoKeys] = useState<Map<number, string>>(new Map());
  const [showTrailer, setShowTrailer] = useState(false);
  const navigate = useNavigate();
  const { toggleWatchlist, inWatchlist } = useStore();
  const { openCardModal } = useCardModal();
  const featured = items.slice(0, 6);
  const trailerFetched = useRef(new Set<number>());

  useEffect(() => {
    if (!featured.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featured.length), 8000);
    return () => clearInterval(t);
  }, [featured.length]);

  // Fetch trailer for current item
  useEffect(() => {
    setShowTrailer(false);
    const current = featured[idx];
    if (!current || trailerFetched.current.has(current.id)) return;
    trailerFetched.current.add(current.id);
    (async () => {
      try {
        const type = mediaTypeOf(current);
        const details = await tmdbApi.details(type, current.id);
        const trailer = details.videos?.results?.find(
          (v: any) => v.type === "Trailer" && v.site === "YouTube"
        );
        if (trailer) {
          setVideoKeys((prev) => new Map(prev).set(current.id, trailer.key));
        }
      } catch {
        // trailer fetch is non-critical
      }
    })();
  }, [idx, featured]);

  // Delay trailer appearance by 5s after slide change
  useEffect(() => {
    setShowTrailer(false);
    const current = featured[idx];
    if (!current) return;
    const key = videoKeys.get(current.id);
    if (!key) return;
    const t = setTimeout(() => setShowTrailer(true), 5000);
    return () => clearTimeout(t);
  }, [idx, featured, videoKeys]);

  if (!featured.length) {
    return <div className="h-[85vh] w-full shimmer" />;
  }

  const m = featured[idx];
  const type = mediaTypeOf(m);
  const saved = inWatchlist(m.id);
  const videoKey = videoKeys.get(m.id);
  const showVideo = showTrailer && videoKey;

  return (
    <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={m.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <LazyImage
            src={IMG.backdrop(m.backdrop_path)}
            alt={title(m)}
            className="h-full w-full animate-ken-burns"
          />
        </motion.div>
      </AnimatePresence>

      {/* YouTube trailer overlay */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[5]"
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${videoKey}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1`}
              className="pointer-events-none h-full w-full"
              style={{
                border: "none",
                transform: "scale(1.1)",
                filter: "brightness(0.7)",
              }}
              allow="autoplay; encrypted-media"
              title="Trailer preview"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-black/40" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* gradients (always present under video) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-black/40 pointer-events-none" />

      {/* ambient floating glows */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px] animate-float-glow" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[120px] animate-float-glow" />

      {/* scan line effect */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div className="h-px w-full bg-violet-400/30" style={{ animation: "scan-line 8s linear infinite" }} />
      </div>

      <div className="absolute inset-0 flex items-center">
        <div className="max-w-2xl px-4 md:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              <span className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-300">
                <Star width={12} height={12} /> {type === "tv" ? "Featured Series" : "Featured Film"}
              </span>
              <h1 className="mb-4 text-4xl font-black leading-none tracking-tighter text-glow md:text-7xl">
                {title(m)}
              </h1>
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-medium">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star width={14} height={14} />
                  {m.vote_average?.toFixed(1)}
                </span>
                <span className="text-zinc-400">{year(m)}</span>
                <span className="rounded border border-white/20 px-2 py-0.5 text-xs uppercase">
                  {type === "tv" ? "Series" : "Movie"}
                </span>
                <span className="rounded bg-violet-600/30 px-2 py-0.5 text-xs font-bold text-violet-200">
                  4K HDR
                </span>
              </div>
              <p className="mb-7 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">
                {m.overview}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(`/watch/${type}/${m.id}`)}
                  className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition hover:scale-105 hover:bg-zinc-200"
                >
                  <Play width={20} height={20} /> Play Now
                </button>
                <button
                  onClick={() => setShowTrailer(!showVideo)}
                  className="flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold transition hover:bg-white/15"
                >
                  <Play width={16} height={16} /> {showVideo ? "Hide Trailer" : "Trailer"}
                </button>
                <button
                  onClick={() => openCardModal(m)}
                  className="flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold transition hover:bg-white/15"
                >
                  <Info width={18} height={18} /> More Info
                </button>
                <button
                  onClick={() => toggleWatchlist({ ...m, media_type: type })}
                  className="flex h-12 w-12 items-center justify-center rounded-full glass transition hover:bg-white/15"
                  aria-label="Watchlist"
                >
                  {saved ? (
                    <Check width={20} height={20} className="text-emerald-400" />
                  ) : (
                    <PlusIcon width={20} height={20} />
                  )}
                </button>
                {showVideo && (
                  <button
                    onClick={() => setMuted(!muted)}
                    className="flex h-12 w-12 items-center justify-center rounded-full glass transition hover:bg-white/15"
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <Mute width={18} height={18} /> : <Volume width={18} height={18} />}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* indicators */}
      <div className="absolute bottom-8 right-4 z-20 flex gap-2 md:right-10">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1 rounded-full transition-all ${
              i === idx ? "w-8 bg-violet-400" : "w-4 bg-white/30"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
