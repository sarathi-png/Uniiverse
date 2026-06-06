import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dubmvApi } from "../api/dubmv";
import { tmdbApi, IMG } from "../api/tmdb";
import Player from "../components/Player";
import { ChevronLeft, ExternalLink } from "../components/icons";
import { useStore } from "../store/useStore";
import LazyImage from "../components/LazyImage";

export default function DubmvWatch() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const numFileId = Number(fileId);
  const { upsertProgress } = useStore();

  const passedEntry = (location.state as { entry?: any })?.entry;

  const { data: entry, isLoading } = useQuery({
    queryKey: ["dubmv-entry", numFileId],
    queryFn: async () => {
      try {
        return await dubmvApi.lookup(numFileId);
      } catch {
        return await dubmvApi.scrape(numFileId);
      }
    },
    enabled: !(passedEntry?.directUrl) && !!numFileId,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  const activeEntry = passedEntry?.directUrl ? passedEntry : entry;

  const tmdbId = activeEntry?.tmdbId ?? null;

  const { data: tmdbData } = useQuery({
    queryKey: ["tmdb-dubmv", tmdbId, activeEntry?.type],
    queryFn: () => tmdbApi.details(activeEntry!.type, tmdbId!),
    enabled: !!tmdbId && !!activeEntry,
    staleTime: 1000 * 60 * 10,
  });

  const videoUrl = dubmvApi.streamUrl(numFileId);

  if (isLoading || !activeEntry) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6">
        <button
          onClick={() => navigate("/browse/tamil-dubbed")}
          className="mb-4 flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white"
        >
          <ChevronLeft width={18} height={18} /> Back to Tamil Dubbed
        </button>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <Player
              key={numFileId}
              src={videoUrl}
              poster={tmdbData ? IMG.backdrop(tmdbData.backdrop_path, "w780") : undefined}
              title={activeEntry.title}
              onProgress={(p) => {
                if (tmdbData && p > 0) {
                  upsertProgress({
                    ...tmdbData,
                    media_type: activeEntry.type,
                    progress: Math.min(Math.round(p), 95),
                    updatedAt: Date.now(),
                  });
                }
              }}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold md:text-2xl">{activeEntry.title}</h1>
              <span className="text-sm text-zinc-400">({activeEntry.year})</span>
              {activeEntry.quality && (
                <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                  {activeEntry.quality}
                </span>
              )}
              {activeEntry.fileSize && (
                <span className="text-xs text-zinc-500">{activeEntry.fileSize}</span>
              )}
              {activeEntry.duration && (
                <span className="text-xs text-zinc-500">{activeEntry.duration}</span>
              )}
            </div>

            {tmdbData?.overview && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{tmdbData.overview}</p>
            )}
          </div>

          <div className="space-y-4">
            {tmdbData && (
              <div className="glass rounded-2xl p-4">
                <div className="flex gap-3">
                  <div className="w-20 shrink-0 overflow-hidden rounded-lg">
                    <LazyImage
                      src={IMG.poster(tmdbData.poster_path, "w300")}
                      alt={activeEntry.title}
                      className="aspect-[2/3] w-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold">{activeEntry.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                      <span>{activeEntry.year}</span>
                      <span>·</span>
                      <span className="capitalize">{activeEntry.type}</span>
                    </div>
                    <p className="mt-2 line-clamp-4 text-xs text-zinc-500">
                      {tmdbData.overview || "No description available."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="glass rounded-2xl p-4">
              <h3 className="mb-2 text-sm font-bold text-white">File Info</h3>
              <div className="space-y-1.5 text-xs text-zinc-400">
                <p>Format: {activeEntry.format || "MP4"}</p>
                <p>Size: {activeEntry.fileSize || "N/A"}</p>
                <p>Duration: {activeEntry.duration || "N/A"}</p>
                <p>Quality: {activeEntry.quality}</p>
                <p>Source: IsaiDub / dubmv.xyz</p>
              </div>
            </div>

            <a
              href={`/player/dubmv-proxy/${numFileId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600/80 p-3 text-sm font-bold text-white transition hover:bg-violet-500"
            >
              <ExternalLink width={16} height={16} />
              Open in new tab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

