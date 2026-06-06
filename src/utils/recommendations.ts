import type { MediaItem } from "../api/tmdb";
import type { WatchProgress } from "../store/useStore";

export interface UserPreferences {
  preferredDecades: number[];
  preferredTypes: ("movie" | "tv")[];
}

export function analyzePreferences(history: WatchProgress[]): UserPreferences {
  const decades: Record<number, number> = {};
  const types: Record<string, number> = {};

  for (const item of history) {
    const date = item.release_date || item.first_air_date || "";
    const year = date ? parseInt(date.substring(0, 4)) : 2024;
    const decade = Math.floor(year / 10) * 10;
    decades[decade] = (decades[decade] || 0) + 1;
    types[item.media_type] = (types[item.media_type] || 0) + 1;
  }

  return {
    preferredDecades: Object.entries(decades)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([d]) => parseInt(d)),
    preferredTypes: Object.entries(types)
      .sort(([, a], [, b]) => b - a)
      .map(([t]) => t as "movie" | "tv"),
  };
}

export function getPersonalizedPicks(
  allItems: MediaItem[],
  history: WatchProgress[],
  limit = 20
): MediaItem[] {
  if (allItems.length === 0 || history.length === 0) return [];

  const historyIds = new Set(history.map((h) => `${h.media_type}-${h.id}`));
  const seen = new Set<string>();
  const result: MediaItem[] = [];

  const prefs = analyzePreferences(history);

  const scored = allItems.map((item) => {
    let score = 0;
    const date = item.release_date || item.first_air_date || "";
    const y = date ? parseInt(date.substring(0, 4)) : 0;
    const decade = Math.floor(y / 10) * 10;

    if (prefs.preferredDecades.includes(decade)) score += 2;
    if (prefs.preferredTypes.includes(item.media_type || (item.name ? "tv" : "movie"))) score += 1;

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  for (const { item } of scored) {
    const mediaType = item.media_type || (item.name ? "tv" : "movie");
    const key = `${mediaType}-${item.id}`;
    if (historyIds.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}
