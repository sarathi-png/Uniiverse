import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { dubmvApi, type DubmvPopularItem } from "../api/dubmv";

const GRADIENTS = [
  "from-violet-900/80 to-purple-900/80",
  "from-blue-900/80 to-cyan-900/80",
  "from-emerald-900/80 to-teal-900/80",
  "from-rose-900/80 to-pink-900/80",
  "from-amber-900/80 to-orange-900/80",
  "from-indigo-900/80 to-blue-900/80",
  "from-fuchsia-900/80 to-violet-900/80",
];

function PosterPlaceholder({ title, className }: { title: string; className?: string }) {
  const gradient = GRADIENTS[title.length % GRADIENTS.length];
  const initial = title.charAt(0).toUpperCase();
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${className || ""}`}>
      <span className="text-4xl font-bold text-white/30 select-none">{initial}</span>
    </div>
  );
}

function PopularCard({ item }: { item: DubmvPopularItem }) {
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);
  const hasPoster = !imgFailed && item.posterUrl?.startsWith("http");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10 transition hover:ring-violet-500/50"
    >
      <div className="relative h-full w-full overflow-hidden">
        {hasPoster ? (
          <img
            src={item.posterUrl!}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <PosterPlaceholder title={item.title} className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full transition group-hover:translate-y-0">
          {item.cached && item.fileId ? (
            <button
              onClick={() => navigate(`/watch/dubmv/${item.fileId}`, { state: { entry: item } })}
              className="w-full rounded-lg bg-violet-600 py-2 text-center text-sm font-bold text-white transition hover:bg-violet-500"
            >
              Watch Now
            </button>
          ) : null}
        </div>
      </div>
      {item.quality && (
        <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
          {item.quality}
        </div>
      )}
      <div className="absolute bottom-1 left-2 right-2 opacity-100 transition duration-300 group-hover:opacity-0">
        <p className="truncate text-sm font-semibold text-white drop-shadow-lg">{item.title}</p>
        <p className="text-xs text-zinc-400">{item.year}</p>
      </div>
    </motion.div>
  );
}

export default function TamilDubbed() {
  const [search, setSearch] = useState("");
  const [showAllCached, setShowAllCached] = useState(false);

  const { data: popularData, isLoading: popularLoading } = useQuery({
    queryKey: ["tamil-dubbed-popular"],
    queryFn: () => dubmvApi.popular(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: cachedData } = useQuery({
    queryKey: ["tamil-dubbed-list"],
    queryFn: () => dubmvApi.list({ matched: false, limit: 100 }),
    staleTime: 1000 * 60 * 2,
  });

  const popularItems = popularData?.items ?? [];
  const cachedItems = cachedData?.items ?? [];

  const cachedByTmdb = new Map<number, boolean>();
  for (const c of cachedItems) {
    if (c.tmdbId) cachedByTmdb.set(c.tmdbId, true);
  }

  const mergedPopular = popularItems.map((item) => {
    if (!item.cached && cachedByTmdb.has(item.tmdbId)) {
      return { ...item, cached: true };
    }
    return item;
  });

  const filtered = search
    ? mergedPopular.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()))
    : mergedPopular;

  const cached = filtered.filter((i) => i.cached);

  const displayCached = showAllCached ? cached : cached.slice(0, 24);

  const extraCached = cachedItems.filter(
    (c) => c.tmdbId && !mergedPopular.some((p) => p.tmdbId === c.tmdbId)
  );

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Popular Tamil Dubbed
                </span>
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Top globally popular movies available in Tamil
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search popular..."
              className="w-48 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/50 sm:w-64"
            />
          </div>
        </div>

        {popularLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <p className="text-lg font-semibold">No titles found</p>
            <p className="text-sm mt-2">Run `npm run dubmv:popular` to generate the list</p>
          </div>
        ) : (
          <>
            {/* Ready to Play Section */}
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <h2 className="text-xl font-bold text-white">
                  Ready to Play
                </h2>
                <span className="text-sm text-zinc-500">({cached.length})</span>
              </div>

              {cached.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
                  <p className="text-sm text-zinc-500">
                    No cached titles yet. Run <code className="text-violet-400">npm run dubmv:seed</code> to populate.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {displayCached.map((item) => (
                      <PopularCard key={`cached-${item.tmdbId}`} item={item} />
                    ))}
                  </div>
                  {cached.length > 24 && (
                    <div className="mt-5 flex justify-center">
                      <button
                        onClick={() => setShowAllCached(!showAllCached)}
                        className="rounded-xl bg-white/5 px-5 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white"
                      >
                        {showAllCached ? "Show Less" : `Show All ${cached.length} Cached Titles`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

          </>
        )}

        {/* Extra Cached (non-popular) */}
        {extraCached.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-3 w-3 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
              <h2 className="text-xl font-bold text-white">Recently Added</h2>
              <span className="text-sm text-zinc-500">({extraCached.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {extraCached.slice(0, 24).map((entry) => (
                <ExtraCachedCard key={entry.fileId} entry={entry} />
              ))}
            </div>
            {extraCached.length > 24 && (
              <div className="mt-4 text-center text-sm text-zinc-500">
                +{extraCached.length - 24} more
              </div>
            )}
          </section>
        )}

        {/* How to get more */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
          <p className="font-semibold text-white mb-2">Get more cached titles</p>
          <p>Run <code className="text-violet-400">npm run dubmv:seed</code> to crawl the default range (100000-100200).</p>
          <p className="mt-1">Or <code className="text-violet-400">npm run dubmv:crawl 80000 150000</code> for a wider scan.</p>
          <p className="mt-3 text-xs text-zinc-600">
            To refresh the popular list: <code className="text-violet-400">npm run dubmv:popular</code>
          </p>
        </div>
      </div>
    </div>
  );
}
function ExtraCachedCard({ entry }: { entry: any }) {
  const [imgFailed, setImgFailed] = useState(false);
  const navigate = useNavigate();
  const posterSrc = entry.posterUrl?.startsWith("http")
    ? entry.posterUrl
    : entry.posterUrl?.startsWith("/")
      ? `https://image.tmdb.org/t/p/w342${entry.posterUrl}`
      : null;
  const hasPoster = !imgFailed && !!posterSrc;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10 transition hover:ring-violet-500/50"
    >
      <div className="relative h-full w-full overflow-hidden">
        {hasPoster ? (
          <img
            src={posterSrc!}
            alt={entry.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <PosterPlaceholder title={entry.title} className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full transition group-hover:translate-y-0">
          <button
            onClick={() => navigate(`/watch/dubmv/${entry.fileId}`, { state: { entry } })}
            className="w-full rounded-lg bg-violet-600 py-2 text-center text-sm font-bold text-white transition hover:bg-violet-500"
          >
            Watch Now
          </button>
        </div>
      </div>
      <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        {entry.quality}
      </div>
      <div className="absolute bottom-1 left-2 right-2 opacity-100 transition duration-300 group-hover:opacity-0">
        <p className="truncate text-sm font-semibold text-white drop-shadow-lg">{entry.title}</p>
        <p className="text-xs text-zinc-400">{entry.year}</p>
      </div>
    </motion.div>
  );
}
