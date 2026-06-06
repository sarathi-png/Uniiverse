import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  IMG,
  title,
  year,
  type MediaType,
} from "../api/tmdb";
import { useDetails } from "../hooks/queries";
import { useStore } from "../store/useStore";
import LazyImage from "../components/LazyImage";
import Row from "../components/Row";
import { Play, PlusIcon, Check, Star, Clock } from "../components/icons";
import ContentRatingBadge from "../components/ContentRatingBadge";

export default function Details() {
  const { type, id } = useParams<{ type: MediaType; id: string }>();
  const navigate = useNavigate();
  const numId = Number(id);
  const { data, isLoading } = useDetails(type as MediaType, numId);
  const { toggleWatchlist, inWatchlist } = useStore();
  const [tab, setTab] = useState<"overview" | "cast" | "reviews">("overview");

  if (isLoading || !data) {
    return (
      <div className="min-h-screen pt-16">
        <div className="h-[60vh] w-full shimmer" />
      </div>
    );
  }

  const saved = inWatchlist(numId);
  const trailer = data.videos?.results?.find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube"
  );
  const cast = data.credits?.cast?.slice(0, 16) || [];
  const similar = data.similar?.results || [];
  const recommended = data.recommendations?.results || [];
  const reviews = data.reviews?.results?.slice(0, 4) || [];
  const runtime = data.runtime || data.episode_run_time?.[0];

  return (
    <div className="pb-20 md:pb-10">
        {/* Cinematic backdrop */}
      <div className="relative h-[75vh] min-h-[520px] w-full">
        <LazyImage
          src={IMG.backdrop(data.backdrop_path)}
          alt={title(data)}
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/40 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-transparent to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-violet-700/20 blur-[140px]" />

        <div className="absolute bottom-0 w-full px-4 md:px-10">
          <div className="flex flex-col gap-6 pb-10 md:flex-row md:items-end">
            <div className="hidden w-48 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl md:block">
              <LazyImage
                src={IMG.poster(data.poster_path)}
                alt={title(data)}
                className="aspect-[2/3] w-full"
              />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1"
            >
              <h1 className="mb-3 text-3xl font-black tracking-tighter text-glow md:text-6xl">
                {title(data)}
              </h1>
              {data.tagline && (
                <p className="mb-3 italic text-violet-300">{data.tagline}</p>
              )}
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <Star width={15} height={15} />
                  {data.vote_average?.toFixed(1)}
                </span>
                <span className="text-zinc-400">{year(data)}</span>
                <ContentRatingBadge data={data} mediaType={type as MediaType} />
                {runtime && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock width={14} height={14} /> {runtime}m
                  </span>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {data.genres?.slice(0, 3).map((g: any) => (
                    <span
                      key={g.id}
                      className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(`/watch/${type}/${numId}`)}
                  className="flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:scale-105"
                >
                  <Play width={20} height={20} /> Watch Now
                </button>
                <button
                  onClick={() =>
                    toggleWatchlist({ ...data, media_type: type as MediaType })
                  }
                  className="flex items-center gap-2 rounded-full glass px-5 py-3 text-sm font-semibold transition hover:bg-white/15"
                >
                  {saved ? (
                    <>
                      <Check width={18} height={18} className="text-emerald-400" />{" "}
                      In List
                    </>
                  ) : (
                    <>
                      <PlusIcon width={18} height={18} /> Watchlist
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-10">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-white/10">
          {(["overview", "cast", "reviews"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-3 text-sm font-semibold capitalize transition ${
                tab === t ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t}
              {tab === t && (
                <motion.span
                  layoutId="tab"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-500"
                />
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="max-w-3xl leading-relaxed text-zinc-300">
                {data.overview}
              </p>
              {trailer && (
                <div className="mt-6 aspect-video w-full max-w-3xl overflow-hidden rounded-2xl ring-1 ring-white/10">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title="Trailer"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div className="glass rounded-2xl p-4">
                <h3 className="mb-3 font-bold">Details</h3>
                {data.status && (
                  <Detail label="Status" value={data.status} />
                )}
                {data.original_language && (
                  <Detail
                    label="Language"
                    value={data.original_language.toUpperCase()}
                  />
                )}
                {data.number_of_seasons && (
                  <Detail label="Seasons" value={data.number_of_seasons} />
                )}
                {data.budget > 0 && (
                  <Detail
                    label="Budget"
                    value={`$${(data.budget / 1e6).toFixed(1)}M`}
                  />
                )}
                {data.production_companies?.[0] && (
                  <Detail
                    label="Studio"
                    value={data.production_companies[0].name}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "cast" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {cast.map((c: any) => (
              <Link
                key={c.id}
                to={`/search?q=${encodeURIComponent(c.name)}`}
                className="group text-center"
              >
                <div className="mx-auto mb-2 aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/10 transition group-hover:ring-violet-500/50">
                  <LazyImage
                    src={IMG.profile(c.profile_path)}
                    fallbackText={c.name}
                    alt={c.name}
                    className="h-full w-full"
                  />
                </div>
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-zinc-500">{c.character}</p>
              </Link>
            ))}
          </div>
        )}

        {tab === "reviews" && (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.length ? (
              reviews.map((r: any) => (
                <div key={r.id} className="glass rounded-2xl p-5">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 font-bold">
                      {r.author[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.author}</p>
                      {r.author_details?.rating && (
                        <p className="flex items-center gap-1 text-xs text-amber-400">
                          <Star width={11} height={11} />
                          {r.author_details.rating}/10
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="line-clamp-5 text-sm leading-relaxed text-zinc-400">
                    {r.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No reviews yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-10">
        {recommended.length > 0 && (
          <Row title="Recommended For You" items={recommended} />
        )}
        {similar.length > 0 && (
          <Row title="More Like This" items={similar} />
        )}
      </div>
      </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1.5 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-200">{value}</span>
    </div>
  );
}
