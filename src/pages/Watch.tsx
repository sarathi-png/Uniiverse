import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IMG, title, type MediaType } from "../api/tmdb";
import { tmdbApi } from "../api/tmdb";
import { mediaStreamApi, type MediaStreamSource } from "../api/stream";
import type { SubtitleTrack } from "../hooks/usePlayer";
import { useDetails } from "../hooks/queries";
import { useStore } from "../store/useStore";
import Player from "../components/Player";
import LazyImage from "../components/LazyImage";
import AgeGate from "../components/AgeGate";
import {
  ChevronLeft,
  Star,
  Play,
  Check,
  PlusIcon,
  Info,
} from "../components/icons";
import { useQuery } from "@tanstack/react-query";

export default function Watch() {
  const { type, id } = useParams<{ type: MediaType; id: string }>();
  const navigate = useNavigate();
  const numId = Number(id);
  const { data } = useDetails(type as MediaType, numId);
  const { upsertProgress, addToHistory, toggleWatchlist, inWatchlist, targetAudioLang } = useStore();

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [sources, setSources] = useState<MediaStreamSource[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [failoverMsg, setFailoverMsg] = useState("");
  const [playerKey, setPlayerKey] = useState(0);
  const [sourceIdx, setSourceIdx] = useState(0);
  const lastProgressTime = useRef(0);
  const autoFallbackTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sourceIdxRef = useRef(0);
  const sourcesLenRef = useRef(0);

  const currentSource = sources[sourceIdx];

  const LANG_CODE_MAP: Record<string, string> = {
    hi_dub: "hi", ta_dub: "ta", te_dub: "te",
    ml_dub: "ml", es_dub: "es", en_dub: "en",
  };
  const streamLang = targetAudioLang ? LANG_CODE_MAP[targetAudioLang] || targetAudioLang.replace("_dub", "") : undefined;

  const fetchSources = useCallback(async () => {
    if (!numId) return;
    setLoadingSources(true);
    try {
      const result = await mediaStreamApi.getStream(
        numId, type as "movie" | "tv",
        type === "tv" ? season : undefined,
        type === "tv" ? episode : undefined,
        streamLang
      );
      setSources(result.sources);
      sourcesLenRef.current = result.sources.length;
      setSubtitles(
        result.subtitles.map((s, i) => ({
          id: i,
          label: s.label,
          language: s.lang,
          url: s.url,
          kind: "subtitles" as const,
        }))
      );
      setSourceIdx(0);
      sourceIdxRef.current = 0;
      setPlayerKey((k) => k + 1);
      setFailoverMsg("");
    } catch {
      setFailoverMsg("Failed to load sources. Try again later.");
    }
    setLoadingSources(false);
  }, [numId, type, season, episode, streamLang]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const seasonData = useQuery({
    queryKey: ["season", numId, season],
    queryFn: () => tmdbApi.season(numId, season),
    enabled: type === "tv",
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (data) {
      const payload = {
        ...data,
        media_type: type as MediaType,
        season: type === "tv" ? season : undefined,
        episode: type === "tv" ? episode : undefined,
        updatedAt: Date.now(),
      };
      addToHistory(payload);
    }
  }, [data, type, season, episode, addToHistory]);

  useEffect(() => {
    if (streamLang && sources.length > 0) {
      lastProgressTime.current = Date.now();
    }
  }, [sources, streamLang]);

  const handleProgress = useCallback((progress: number, _currentTime: number, _duration: number) => {
    if (data && progress > 0) {
      lastProgressTime.current = Date.now();
      upsertProgress({
        ...data,
        media_type: type as MediaType,
        season: type === "tv" ? season : undefined,
        episode: type === "tv" ? episode : undefined,
        progress: Math.min(Math.round(progress), 95),
        updatedAt: Date.now(),
      });
    }
  }, [data, type, season, episode, upsertProgress]);

  const handlePrevEpisode = useCallback(() => {
    if (episode > 1) {
      setEpisode((e) => e - 1);
    } else if (season > 1) {
      setSeason((s) => s - 1);
    }
  }, [episode, season]);

  const handleNextEpisode = useCallback(() => {
    const episodes = seasonData.data?.episodes || [];
    if (episode < episodes.length) {
      setEpisode((e) => e + 1);
    }
  }, [episode, seasonData.data?.episodes]);

  const episodes = seasonData.data?.episodes || [];
  const hasPrev = episode > 1;
  const hasNext = episode < episodes.length;

  // Auto-fallback: if source doesn't produce progress in 30s, try next
  useEffect(() => {
    if (sourcesLenRef.current <= 1) return;
    const current = sources[sourceIdxRef.current];
    if (current?.isEmbed) return; // embeds don't fire progress events
    if (current?.playUrl) return; // playUrl sources (transcoding) need more time

    lastProgressTime.current = Date.now();
    autoFallbackTimer.current = setTimeout(() => {
      const elapsed = Date.now() - lastProgressTime.current;
      if (elapsed >= 30000 && sourceIdxRef.current < sourcesLenRef.current - 1) {
        const nextIdx = sourceIdxRef.current + 1;
        setFailoverMsg(`Source ${sourceIdxRef.current + 1} timed out, trying next...`);
        setSourceIdx(nextIdx);
        sourceIdxRef.current = nextIdx;
        setPlayerKey((k) => k + 1);
      }
    }, 30000);
    return () => clearTimeout(autoFallbackTimer.current);
  }, [playerKey, sources]);

  const setSource = useCallback((idx: number) => {
    sourceIdxRef.current = idx;
    setSourceIdx(idx);
    setPlayerKey((k) => k + 1);
    setFailoverMsg("");
  }, []);

  const saved = data ? inWatchlist(numId) : false;

  return (
    <AgeGate data={data}>
      <div className="min-h-screen pt-16">
        <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-6">
          <button
            onClick={() => navigate(`/title/${type}/${numId}`)}
            className="mb-4 flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white"
          >
            <ChevronLeft width={18} height={18} /> Back to details
          </button>

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div>
              {loadingSources ? (
                <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-[#020202] ring-1 ring-white/10">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    <Play width={20} height={20} className="text-violet-400 ml-1" />
                  </div>
                  <p className="ml-4 text-sm text-zinc-400">Loading available sources...</p>
                </div>
              ) : currentSource ? (
                <div>
                  <Player
                    key={playerKey}
                    src={currentSource.playUrl || currentSource.url}
                    poster={data ? IMG.backdrop(data.backdrop_path, "w780") : undefined}
                    title={data ? title(data) : undefined}
                    subtitles={subtitles}
                    isEmbed={currentSource.isEmbed}
                    onProgress={handleProgress}
                    onError={() => {
                      if (sourceIdxRef.current < sourcesLenRef.current - 1) {
                        const nextIdx = sourceIdxRef.current + 1;
                        setFailoverMsg(`Source ${sourceIdxRef.current + 1} failed, trying next...`);
                        setSource(nextIdx);
                      } else {
                        setFailoverMsg("All sources failed. Try again later.");
                      }
                    }}
                    onPrevEpisode={type === "tv" ? handlePrevEpisode : undefined}
                    onNextEpisode={type === "tv" ? handleNextEpisode : undefined}
                    hasPrev={type === "tv" && hasPrev}
                    hasNext={type === "tv" && hasNext}
                  />
                  {failoverMsg && (
                    <div className="mt-2 rounded-md bg-red-600/90 px-3 py-1.5 text-center text-xs font-bold text-white shadow-lg">
                      {failoverMsg}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-[#020202] ring-1 ring-white/10">
                  <div className="text-center">
                    <Info width={32} height={32} className="mx-auto mb-2 text-zinc-600" />
                    <p className="text-zinc-500">No sources available</p>
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 border border-white/10">
                <button
                  onClick={() => {
                    const next = sourceIdxRef.current < sourcesLenRef.current - 1 ? sourceIdxRef.current + 1 : 0;
                    setFailoverMsg("");
                    setSource(next);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Switch Source
                </button>
                {sources.length > 0 && (
                  <span className="text-[11px] text-zinc-500">
                    {sourceIdx + 1} / {sources.length}
                  </span>
                )}
              </div>

              {data && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-bold md:text-2xl">{title(data)}</h1>
                  <span className="flex items-center gap-1 text-sm text-amber-400">
                    <Star width={14} height={14} />
                    {data.vote_average?.toFixed(1)}
                  </span>
                  {type === "tv" && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                      S{season} · E{episode}
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() =>
                        toggleWatchlist({ ...data, media_type: type as MediaType })
                      }
                      className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm transition hover:bg-white/15"
                    >
                      {saved ? (
                        <Check width={16} height={16} className="text-emerald-400" />
                      ) : (
                        <PlusIcon width={16} height={16} />
                      )}
                      {saved ? "Saved" : "Watchlist"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 glass rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-32 w-32 bg-violet-600/10 blur-[50px] pointer-events-none" />

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                      <rect x="3" y="4" width="18" height="6" rx="2" />
                      <rect x="3" y="14" width="18" height="6" rx="2" />
                      <path d="M7 7h.01M7 17h.01" />
                    </svg>
                    <h3 className="font-bold text-lg">Source Files</h3>
                    {streamLang && (
                      <span className="ml-2 rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300 uppercase tracking-wider">
                        {streamLang}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 relative z-10">
                  {sources.map((s, i) => {
                    const active = i === sourceIdx;
                    return (
                      <button
                        key={`${s.name}-${i}`}
                        onClick={() => setSource(i)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                          active
                            ? "border-violet-500 bg-violet-500/20 text-white"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
                        <span className="font-semibold">{s.provider}</span>
                        <span className="rounded bg-black/40 px-1.5 text-[10px] text-zinc-400">
                          {s.quality}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {type === "tv" && data?.seasons && (
                <div className="glass rounded-2xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="font-bold">Episodes</h3>
                    <select
                      value={season}
                      onChange={(e) => {
                        setSeason(Number(e.target.value));
                        setEpisode(1);
                      }}
                      className="ml-auto rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm outline-none"
                    >
                      {data.seasons
                        .filter((s: any) => s.season_number > 0)
                        .map((s: any) => (
                          <option key={s.id} value={s.season_number}>
                            Season {s.season_number}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="no-scrollbar max-h-[520px] space-y-2 overflow-y-auto">
                    {seasonData.isLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-20 rounded-xl shimmer" />
                        ))
                      : episodes.map((ep: any) => (
                          <button
                            key={ep.id}
                            onClick={() => setEpisode(ep.episode_number)}
                            className={`flex w-full gap-3 rounded-xl border p-2 text-left transition ${
                              episode === ep.episode_number
                                ? "border-violet-500 bg-violet-500/15"
                                : "border-transparent bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg">
                              <LazyImage
                                src={IMG.backdrop(ep.still_path, "w300")}
                                fallbackText={`E${ep.episode_number}`}
                                alt={ep.name}
                                className="h-full w-full"
                              />
                              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px]">
                                E{ep.episode_number}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {ep.name}
                              </p>
                              <p className="line-clamp-2 text-xs text-zinc-500">
                                {ep.overview || "No description."}
                              </p>
                            </div>
                          </button>
                        ))}
                  </div>
                </div>
              )}

              {data && (
                <div className="glass rounded-2xl p-4">
                  <div className="flex gap-3">
                    <div className="w-20 shrink-0 overflow-hidden rounded-lg">
                      <LazyImage
                        src={IMG.poster(data.poster_path, "w300")}
                        alt={title(data)}
                        className="aspect-[2/3] w-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold">{title(data)}</p>
                      <p className="line-clamp-4 mt-1 text-xs text-zinc-400">
                        {data.overview}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass rounded-2xl p-4 text-xs text-zinc-400">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-white">
                  <Play width={14} height={14} /> Playback Tips
                </h3>
                <ul className="space-y-1.5">
                  <li>• Resume watching auto-saved to your profile.</li>
                  <li>• Space / K = play/pause · F = fullscreen · M = mute</li>
                  <li>• ← → = seek 10s · ↑ ↓ = volume · 0-9 = seek %</li>
                  <li>• Click AUDIO / CC / SPEED in player to change tracks.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AgeGate>
  );
}
