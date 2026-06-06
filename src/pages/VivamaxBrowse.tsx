import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { vivamaxApi, type VivamaxItem } from "../api/vivamax";
import AgeGate from "../components/AgeGate";

const GRADIENTS = [
  "from-rose-900/80 to-pink-900/80",
  "from-purple-900/80 to-violet-900/80",
  "from-red-900/80 to-orange-900/80",
  "from-fuchsia-900/80 to-purple-900/80",
  "from-pink-900/80 to-rose-900/80",
  "from-violet-900/80 to-fuchsia-900/80",
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

function VivamaxCard({ item }: { item: VivamaxItem }) {
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);
  const hasPoster = !imgFailed && !!item.posterUrl?.startsWith("http");

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
          <button
            onClick={() => navigate(`/watch/vivamax/${item.pathSlug}`, { state: { item } })}
            className="w-full rounded-lg bg-violet-600 py-2 text-center text-sm font-bold text-white transition hover:bg-violet-500"
          >
            Watch Now
          </button>
        </div>
      </div>
      {item.quality && (
        <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
          {item.quality}
        </div>
      )}
      {item.rating && (
        <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
          {item.rating.toFixed(1)}
        </div>
      )}
      <div className="absolute bottom-1 left-2 right-2 opacity-100 transition duration-300 group-hover:opacity-0">
        <p className="truncate text-sm font-semibold text-white drop-shadow-lg">{item.title}</p>
        <p className="text-xs text-zinc-400">{item.year || "—"}</p>
      </div>
    </motion.div>
  );
}

export default function VivamaxBrowse() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vivamax-list"],
    queryFn: () => vivamaxApi.list({ limit: 1272 }),
    staleTime: 1000 * 60 * 5,
  });

  const items = data?.items ?? [];
  const readyItems = items.filter((i) => i.embedUrl);
  const pendingItems = items.filter((i) => !i.embedUrl);

  const filteredReady = search
    ? readyItems.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()))
    : readyItems;

  return (
    <AgeGate adult>
      <div className="min-h-screen pt-20 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold">
                  <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
                    Vivamax Collection
                  </span>
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Filipino adult films — 18+ content
                </p>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-48 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/50 sm:w-64"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-zinc-800" />
              ))}
            </div>
          ) : filteredReady.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <p className="text-lg font-semibold">No playable titles found</p>
              <p className="text-sm mt-2">
                Run <code className="text-violet-400">npm run vivamax:embeds</code> to extract embed URLs
              </p>
            </div>
          ) : (
            <>
              {/* Ready to Play */}
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  <h2 className="text-xl font-bold text-white">Ready to Play</h2>
                  <span className="text-sm text-zinc-500">
                    ({filteredReady.length})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredReady.map((item) => (
                    <VivamaxCard key={item.slug} item={item} />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Info */}
          <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
            <p className="font-semibold text-white mb-2">About Vivamax</p>
            <p>
              All content sourced from bibamax.org — strictly 18+. Videos hosted on third-party embed platforms.
            </p>
            <p className="mt-1">
              {pendingItems.length > 0
                ? `${pendingItems.length} more titles pending embed extraction: `
                : `Total: ${items.length} titles in catalog. `}
              <code className="text-violet-400">npm run vivamax:embeds</code>
            </p>
          </div>
        </div>
      </div>
    </AgeGate>
  );
}
