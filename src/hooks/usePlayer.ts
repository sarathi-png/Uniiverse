import { useRef, useState, useCallback, useEffect } from "react";
import Hls from "hls.js";

export interface AudioTrack {
  id: number;
  name: string;
  language: string;
}

export interface SubtitleTrack {
  id: number;
  label: string;
  language: string;
  url?: string;
  kind: "subtitles" | "captions";
}

export interface QualityLevel {
  id: number;
  width: number;
  height: number;
  bitrate: number;
}

interface PlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  buffering: boolean;
  audioTracks: AudioTrack[];
  activeAudioTrack: number;
  subtitleTracks: SubtitleTrack[];
  activeSubtitleTrack: number;
  qualityLevels: QualityLevel[];
  activeQuality: number;
  playbackSpeed: number;
  volume: number;
  muted: boolean;
  isFullscreen: boolean;
  error: string | null;
}

export function usePlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const trackElements = useRef<HTMLTrackElement[]>([]);

  const [state, setState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
    buffering: true,
    audioTracks: [],
    activeAudioTrack: -1,
    subtitleTracks: [],
    activeSubtitleTrack: -1,
    qualityLevels: [],
    activeQuality: -1,
    playbackSpeed: 1,
    volume: 1,
    muted: false,
    isFullscreen: false,
    error: null,
  });

  const update = useCallback((partial: Partial<PlayerState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const loadSource = useCallback((url: string, externalSubtitles?: SubtitleTrack[]) => {
    const video = videoRef.current;
    if (!video) return;

    update({ error: null, buffering: true, audioTracks: [], subtitleTracks: externalSubtitles || [], activeSubtitleTrack: -1 });

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    trackElements.current.forEach((t) => t.remove());
    trackElements.current = [];

    if (externalSubtitles?.length) {
      externalSubtitles.forEach((sub) => {
        if (sub.url) {
          const track = document.createElement("track");
          track.kind = sub.kind;
          track.label = sub.label;
          track.srclang = sub.language;
          track.src = sub.url;
          track.default = false;
          video.appendChild(track);
          trackElements.current.push(track);
        }
      });
    }

    if (url.includes(".m3u8") || url.includes("ezvidapi.com/movie/") || url.includes("ezvidapi.com/tv/")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const audioTracks = (hls.audioTracks || []).map((t, i) => ({
            id: i,
            name: t.name || t.lang || `Track ${i + 1}`,
            language: t.lang || "unknown",
          }));
          const qualityLevels = (hls.levels || []).map((l, i) => ({
            id: i,
            width: l.width,
            height: l.height,
            bitrate: l.bitrate,
          }));
          const allSubs: SubtitleTrack[] = [...(externalSubtitles || [])];
          hls.subtitleTracks?.forEach((t, i) => {
            allSubs.push({
              id: externalSubtitles?.length ? externalSubtitles.length + i : i,
              label: t.name || t.lang || `Subtitle ${i + 1}`,
              language: t.lang || "unknown",
              kind: "subtitles",
            });
          });
          update({
            audioTracks,
            activeAudioTrack: hls.audioTrack,
            qualityLevels,
            activeQuality: hls.autoLevelEnabled ? -1 : hls.currentLevel,
            buffering: false,
            duration: video.duration,
            subtitleTracks: allSubs,
          });
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
          update({ activeQuality: data.level });
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, data) => {
          update({ activeAudioTrack: data.id });
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
          const hlsSubs: SubtitleTrack[] = data.subtitleTracks.map((t, i) => ({
            id: i,
            label: t.name || t.lang || `Subtitle ${i + 1}`,
            language: t.lang || "unknown",
            kind: "subtitles",
          }));
          update({ subtitleTracks: [...(externalSubtitles || []), ...hlsSubs] });
        });

        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            update({ error: `Stream error: ${data.type}` });
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", () => {
          update({ buffering: false, duration: video.duration });
          video.play().catch(() => {});
        });
      }
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        update({ buffering: false, duration: video.duration });
        video.play().catch(() => {});
      });
    }

    const onTime = () => {
      if (video.duration) {
        update({
          currentTime: video.currentTime,
          progress: (video.currentTime / video.duration) * 100,
        });
      }
    };
    const onPlay = () => update({ playing: true });
    const onPause = () => update({ playing: false });
    const onWaiting = () => update({ buffering: true });
    const onCanPlay = () => update({ buffering: false });
    const onEnded = () => update({ playing: false, progress: 100 });
    const onVolumeChange = () => update({ volume: video.volume, muted: video.muted });

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("ended", onEnded);
    video.addEventListener("volumechange", onVolumeChange);

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, [update]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = time;
  }, []);

  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (video) {
      video.volume = Math.max(0, Math.min(1, vol));
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const setAudioTrack = useCallback((id: number) => {
    const hls = hlsRef.current;
    if (hls && hls.audioTracks[id]) {
      hls.audioTrack = id;
      update({ activeAudioTrack: id });
    }
  }, [update]);

  const setSubtitleTrack = useCallback((id: number) => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (hls && typeof hls.subtitleTrack !== "undefined") {
      if (id === -1) {
        hls.subtitleTrack = -1;
      } else if (hls.subtitleTracks?.[id]) {
        hls.subtitleTrack = id;
      }
      update({ activeSubtitleTrack: id });
      return;
    }
    const tracks = video?.textTracks;
    if (tracks) {
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (i === id || id === -1) {
          t.mode = id === -1 ? "disabled" : "showing";
        } else {
          t.mode = "disabled";
        }
      }
    }
    update({ activeSubtitleTrack: id });
  }, [update]);

  const setQuality = useCallback((id: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (id === -1) {
      hls.currentLevel = -1;
      update({ activeQuality: -1 });
    } else if (hls.levels[id]) {
      hls.currentLevel = id;
      update({ activeQuality: id });
    }
  }, [update]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
      update({ playbackSpeed: speed });
    }
  }, [update]);

  const skipIntro = useCallback(() => {
    seek(90);
  }, [seek]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      update({ isFullscreen: false });
    } else {
      container.requestFullscreen().catch(() => {});
      update({ isFullscreen: true });
    }
  }, [update]);

  useEffect(() => {
    const onFSChange = () => {
      update({ isFullscreen: !!document.fullscreenElement });
    };
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, [update]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    containerRef,
    playerState: state,
    loadSource,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setAudioTrack,
    setSubtitleTrack,
    setQuality,
    setPlaybackSpeed,
    skipIntro,
    toggleFullscreen,
  };
}
