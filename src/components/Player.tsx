import { useEffect, useRef, useState, useCallback } from "react";
import { usePlayer, type SubtitleTrack, type AudioTrack } from "../hooks/usePlayer";

interface PlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: SubtitleTrack[];
  audioTracks?: AudioTrack[];
  isEmbed?: boolean;
  onProgress?: (progress: number, currentTime: number, duration: number) => void;
  onError?: () => void;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function Player({
  src, poster, title, subtitles: externalSubtitles, isEmbed,
  onProgress, onError, onPrevEpisode, onNextEpisode, hasPrev, hasNext,
}: PlayerProps) {
  const {
    videoRef, containerRef, playerState, loadSource,
    togglePlay, seek, setVolume, toggleMute,
    setAudioTrack, setSubtitleTrack, setPlaybackSpeed,
    skipIntro, toggleFullscreen,
  } = usePlayer();

  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seekDragging = useRef(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const prevProgress = useRef(0);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    if (playerState.playing) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playerState.playing]);

  useEffect(() => {
    loadSource(src, externalSubtitles);
  }, [src, loadSource]);

  useEffect(() => {
    if (onProgress && playerState.currentTime > 0) {
      const p = Math.floor(playerState.progress);
      if (p !== prevProgress.current && p % 5 < 1) {
        prevProgress.current = p;
        onProgress(playerState.progress, playerState.currentTime, playerState.duration);
      }
    }
  }, [playerState.progress, playerState.currentTime, playerState.duration, onProgress]);

  useEffect(() => {
    if (!playerState.playing && !seekDragging.current) {
      setControlsVisible(true);
      clearTimeout(hideTimer.current);
    }
  }, [playerState.playing]);

  const handleSeekClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = seekBarRef.current;
    if (!bar || !videoRef.current) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * playerState.duration;
  }, [playerState.duration, videoRef]);

  const handleSeekDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekDragging.current) return;
    const bar = seekBarRef.current;
    if (!bar || !videoRef.current) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * playerState.duration;
  }, [playerState.duration, videoRef]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const video = videoRef.current;
    if (!video) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "m":
        e.preventDefault();
        toggleMute();
        break;
      case "ArrowLeft":
        e.preventDefault();
        seek(video.currentTime - 10);
        break;
      case "ArrowRight":
        e.preventDefault();
        seek(video.currentTime + 10);
        break;
      case "ArrowUp":
        e.preventDefault();
        setVolume(video.volume + 0.1);
        break;
      case "ArrowDown":
        e.preventDefault();
        setVolume(video.volume - 0.1);
        break;
      case "0": case "1": case "2": case "3": case "4":
      case "5": case "6": case "7": case "8": case "9":
        e.preventDefault();
        if (video.duration) {
          seek(video.duration * (parseInt(e.key) / 10));
        }
        break;
    }
  }, [togglePlay, toggleFullscreen, toggleMute, seek, setVolume, videoRef]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-[#020202] ring-1 ring-white/10 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (playerState.playing) {
          clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
        }
      }}
    >
      {isEmbed ? (
        <iframe
          src={src}
          className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      ) : (
      <video
        ref={videoRef}
        className="h-full w-full cursor-pointer"
        poster={poster}
        playsInline
        onClick={togglePlay}
        onError={() => onError?.()}
      />
      )}

      {!isEmbed && playerState.buffering && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-violet-400 ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {!isEmbed && !playerState.playing && !playerState.buffering && (
        <div
          className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center"
          onClick={togglePlay}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600/80 backdrop-blur-sm transition-transform hover:scale-110">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-1.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {!isEmbed && (
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

        {/* Title */}
        {title && (
          <div className="absolute bottom-16 left-4 right-4">
            <p className="text-sm font-semibold text-white drop-shadow-lg truncate">{title}</p>
          </div>
        )}

        <div className="relative px-3 pb-2 pt-8">
          {/* Seek Bar */}
          <div
            ref={seekBarRef}
            className="group/seek mb-2 cursor-pointer"
            onMouseDown={() => { seekDragging.current = true; }}
            onMouseUp={() => { seekDragging.current = false; }}
            onMouseLeave={() => { seekDragging.current = false; }}
            onMouseMove={handleSeekDrag}
            onClick={handleSeekClick}
          >
            <div className="relative h-1.5 rounded-full bg-white/20 transition-all group-hover/seek:h-2">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${playerState.progress}%` }}
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-violet-400 shadow-lg opacity-0 transition-opacity group-hover/seek:opacity-100"
                style={{ left: `${playerState.progress}%`, marginLeft: "-7px" }}
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-2">
            {/* Left */}
            <div className="flex items-center gap-1">
              {onPrevEpisode && (
                <button
                  onClick={onPrevEpisode}
                  disabled={!hasPrev}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous episode"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                  </svg>
                </button>
              )}

              <button
                onClick={togglePlay}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
                title={playerState.playing ? "Pause (Space)" : "Play (Space)"}
              >
                {playerState.playing ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  disabled={!hasNext}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Next episode"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18 14.5 12 6 6zM16 6v12h2V6z" />
                  </svg>
                </button>
              )}

              <div className="flex items-center gap-1 ml-1 group/vol">
                <button
                  onClick={toggleMute}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
                  title={playerState.muted ? "Unmute (M)" : "Mute (M)"}
                >
                  {playerState.muted || playerState.volume === 0 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4z" />
                      <path d="m23 9-6 6M17 9l6 6" />
                    </svg>
                  ) : playerState.volume < 0.5 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4z" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4z" />
                      <path d="M19 5a10 10 0 0 1 0 14M15.5 8.5a5 5 0 0 1 0 7" />
                    </svg>
                  )}
                </button>
                <div className="hidden group-hover/vol:flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={playerState.muted ? 0 : playerState.volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 accent-violet-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-white/70 min-w-0 shrink-0">
              <span>{formatTime(playerState.currentTime)}</span>
              <span className="text-white/40">/</span>
              <span>{formatTime(playerState.duration)}</span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right */}
            <div className="flex items-center gap-0.5">
              {playerState.audioTracks.length > 1 && (
                <DropdownMenu
                  label="AUDIO"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  }
                  items={playerState.audioTracks.map((t, i) => ({
                    label: t.name,
                    active: i === playerState.activeAudioTrack,
                    onClick: () => setAudioTrack(i),
                  }))}
                />
              )}

              {playerState.subtitleTracks.length > 0 && (
                <DropdownMenu
                  label="CC"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <path d="M9 10.5a2 2 0 0 1 1.5-.5 2 2 0 0 1 1.5.5M9 13.5a2 2 0 0 0 1.5.5 2 2 0 0 0 1.5-.5M14 10.5a2 2 0 0 1 1.5-.5 2 2 0 0 1 1.5.5M14 13.5a2 2 0 0 0 1.5.5 2 2 0 0 0 1.5-.5" />
                    </svg>
                  }
                  items={[
                    { label: "Off", active: playerState.activeSubtitleTrack === -1, onClick: () => setSubtitleTrack(-1) },
                    ...playerState.subtitleTracks.map((t, i) => ({
                      label: t.label,
                      active: i === playerState.activeSubtitleTrack,
                      onClick: () => setSubtitleTrack(i),
                    })),
                  ]}
                />
              )}

              <DropdownMenu
                label="SPEED"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                }
                items={[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => ({
                  label: `${speed}x`,
                  active: speed === playerState.playbackSpeed,
                  onClick: () => setPlaybackSpeed(speed),
                }))}
              />

              <button
                onClick={skipIntro}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition hidden sm:block"
                title="Skip intro"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18 14.5 12 6 6zM16 6v12h2V6z" />
                </svg>
              </button>

              <button
                onClick={toggleFullscreen}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
                title={playerState.isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
              >
                {playerState.isFullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function DropdownMenu({
  label, icon, items,
}: {
  label: string;
  icon: React.ReactNode;
  items: { label: string; active: boolean; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition text-[10px] font-semibold tracking-wider"
        title={label}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 min-w-[120px] overflow-hidden rounded-lg bg-zinc-900/95 backdrop-blur-lg border border-white/10 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase border-b border-white/5">
            {label}
          </div>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition ${
                item.active
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.active && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              <span className={item.active ? "" : "ml-5"}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { Play } from "./icons";
