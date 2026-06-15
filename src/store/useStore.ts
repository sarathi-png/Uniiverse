import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaItem, MediaType } from "../api/tmdb";

export interface SavedItem extends MediaItem {
  media_type: MediaType;
}

export interface HistoryItem extends SavedItem {
  watchedAt: number;
  progress?: number;
  season?: number;
  episode?: number;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export interface WatchProgress extends SavedItem {
  progress: number; // 0-100
  season?: number;
  episode?: number;
  updatedAt: number;
}

interface State {
  user: { name: string; guest: boolean } | null;
  watchlist: SavedItem[];
  continueWatching: WatchProgress[];
  watchHistory: HistoryItem[];
  recentSearches: string[];
  targetAudioLang: string | null;
  disclaimerDismissed: boolean;
  ageConfirmed: boolean;
  setUser: (u: State["user"]) => void;
  toggleWatchlist: (item: SavedItem) => void;
  inWatchlist: (id: number) => boolean;
  upsertProgress: (item: WatchProgress) => void;
  removeProgress: (id: number) => void;
  addToHistory: (item: SavedItem) => void;
  removeFromHistory: (id: number) => void;
  addSearch: (q: string) => void;
  setTargetAudioLang: (lang: string | null) => void;
  dismissDisclaimer: () => void;
  confirmAge: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      watchlist: [],
      continueWatching: [],
      watchHistory: [],
      recentSearches: [],
      targetAudioLang: null,
      disclaimerDismissed: false,
      ageConfirmed: false,
      setUser: (user) => set({ user }),
      toggleWatchlist: (item) =>
        set((s) => {
          const exists = s.watchlist.some((w) => w.id === item.id);
          return {
            watchlist: exists
              ? s.watchlist.filter((w) => w.id !== item.id)
              : [item, ...s.watchlist],
          };
        }),
      inWatchlist: (id) => get().watchlist.some((w) => w.id === id),
      upsertProgress: (item) =>
        set((s) => {
          const restCW = s.continueWatching.filter((c) => c.id !== item.id);
          const histFiltered = s.watchHistory.filter((h) => h.id !== item.id);
          const histEntry: HistoryItem = {
            ...(item as any),
            watchedAt: Date.now(),
            progress: item.progress,
          };
          return {
            continueWatching: [{ ...item, updatedAt: Date.now() }, ...restCW].slice(0, 20),
            watchHistory: [histEntry, ...histFiltered].slice(0, 50),
          };
        }),
      removeProgress: (id) =>
        set((s) => ({
          continueWatching: s.continueWatching.filter((c) => c.id !== id),
        })),
      addToHistory: (item) =>
        set((s) => {
          const filtered = s.watchHistory.filter((h) => h.id !== item.id);
          const entry: HistoryItem = { ...(item as any), watchedAt: Date.now() };
          return { watchHistory: [entry, ...filtered].slice(0, 50) };
        }),
      removeFromHistory: (id) =>
        set((s) => ({
          watchHistory: s.watchHistory.filter((h) => h.id !== id),
        })),
      addSearch: (q) =>
        set((s) => ({
          recentSearches: [
            q,
            ...s.recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase()),
          ].slice(0, 8),
        })),
      setTargetAudioLang: (lang) => set({ targetAudioLang: lang }),
      dismissDisclaimer: () => set({ disclaimerDismissed: true }),
      confirmAge: () => set({ ageConfirmed: true }),
    }),
    { name: "nova-ott-store" }
  )
);
