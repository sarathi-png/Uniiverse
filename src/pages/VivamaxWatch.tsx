import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vivamaxApi, type VivamaxItem, type VivamaxEmbedResponse } from "../api/vivamax";
import AgeGate from "../components/AgeGate";

export default function VivamaxWatch() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const stateItem = (location.state as { item?: VivamaxItem })?.item;

  const { data: item, isLoading } = useQuery({
    queryKey: ["vivamax-lookup", slug],
    queryFn: () => vivamaxApi.lookup(slug!),
    enabled: !!slug && !stateItem,
    staleTime: 1000 * 60 * 60,
    initialData: stateItem,
  });

  // Fetch embed dynamically if not pre-scraped
  const { data: embedData, isLoading: embedLoading, isError: embedError } = useQuery({
    queryKey: ["vivamax-embed", slug],
    queryFn: () => vivamaxApi.proxyEmbed(slug!),
    enabled: !!slug && !!item && !item.embedUrl,
    staleTime: 0,
    retry: 1,
  });

  const proxyUrl = item?.pathSlug ? `/api/vivamax/proxy-player/${item.pathSlug}` : null;
  const embedUrl = item?.embedUrl || (embedData as VivamaxEmbedResponse | undefined)?.embedUrl || null;
  const isEmbedLoading = !item?.embedUrl && embedLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-20 text-zinc-500">
        <p className="text-lg font-semibold">Movie not found</p>
        <button
          onClick={() => navigate("/browse/vivamax")}
          className="rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
        >
          Back to browse
        </button>
      </div>
    );
  }

  return (
    <AgeGate adult>
      <div className="min-h-screen pt-16 pb-24">
        {/* Video Player */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {isEmbedLoading ? (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-white/10">
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                <p className="text-sm">Loading embed...</p>
              </div>
            </div>
          ) : embedUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
              {item?.embedType === "mp4" ? (
                <video
                  controls
                  className="absolute inset-0 h-full w-full"
                  preload="metadata"
                  playsInline
                >
                  <source src={embedUrl} type="video/mp4" />
                </video>
              ) : (
                <iframe
                  src={proxyUrl || embedUrl}
                  className="absolute inset-0 h-full w-full"
                  allowFullScreen
                  allow="autoplay; fullscreen"
                  loading="lazy"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              )}
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-white/10">
              <div className="text-center text-zinc-500">
                <p className="text-lg font-semibold">
                  {embedError ? "Failed to load embed" : "No embed available"}
                </p>
                <p className="mt-1 text-sm">
                  {embedError
                    ? "The video source could not be reached."
                    : `Run npm run vivamax:embeds to populate`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
          <div className="flex items-start gap-4">
            {item.posterUrl?.startsWith("http") && (
              <img
                src={item.posterUrl}
                alt={item.title}
                className="hidden w-28 shrink-0 rounded-xl object-cover shadow-lg sm:block"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">{item.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                {item.year && <span>{item.year}</span>}
                {item.quality && (
                  <span className="rounded bg-emerald-900/50 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    {item.quality}
                  </span>
                )}
                {item.rating && (
                  <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    ⭐ {item.rating.toFixed(1)}
                  </span>
                )}
                <span className="rounded bg-rose-900/50 px-2 py-0.5 text-xs font-semibold text-rose-400">
                  18+
                </span>
              </div>
              {item.overview && (
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">{item.overview}</p>
              )}
              {item.embedType && (
                <p className="mt-3 text-xs text-zinc-600">
                  Powered by <span className="text-zinc-500 capitalize">{item.embedType}</span>
                </p>
              )}
              <button
                onClick={() => navigate("/browse/vivamax")}
                className="mt-4 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/20 hover:text-white"
              >
                ← Back to collection
              </button>
            </div>
          </div>
        </div>
      </div>
    </AgeGate>
  );
}
