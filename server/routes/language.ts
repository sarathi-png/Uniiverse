import { Router } from "express";
import {
  scanMovie,
  scanMedia,
  getBestFileForLanguage,
  getCachedLanguages,
  getBatchLanguages,
  type SubtitleFile,
} from "../services/languageScanner.js";
import { streamRemuxedFile } from "../services/streamRemux.js";
import { scrapeAll } from "../services/openScraperEngine.js";
import { searchMovieTorrents, searchTVTorrents } from "../services/torrentManager.js";

export const languageRouter = Router();

// Tier 1: Direct file server
// Tier 2: Torrent streams
// Tier 3: Web scrapers / embed providers

languageRouter.get("/media/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const type = (req.query.type as "movie" | "tv") || "movie";
    const season = req.query.season ? Number(req.query.season) : undefined;
    const episode = req.query.episode ? Number(req.query.episode) : undefined;
    const lang = req.query.lang as string | undefined;
    const numId = Number(id);

    // Tier 1: Direct file server sources
    const directResult = await scanMedia(id, type, season, episode);
    const sources: any[] = [];

    if (directResult && directResult.sources.length > 0) {
      for (const [idx, f] of directResult.sources.entries()) {
        sources.push({
          url: f.url,
          directUrl: f.directUrl,
          name: f.name,
          provider: idx === 0 ? "Primary File Server" : `Mirror ${idx + 1}`,
          quality: parseQuality(f.name),
          languages: directResult.languages,
          isEmbed: false,
          playUrl: /\.(mkv|avi|webm)$/i.test(f.name)
            ? `/api/language/transcode?url=${encodeURIComponent(f.directUrl)}&lang=${lang || "en"}`
            : null,
        });
      }
    }

    // Tier 2: Torrent stream sources
    const torrentSources = type === "movie"
      ? await searchMovieTorrents(numId)
      : await searchTVTorrents(numId, season || 1, episode || 1);

    for (const t of torrentSources) {
      sources.push({
        url: `/api/torrent/play?magnet=${encodeURIComponent(t.magnet)}`,
        directUrl: null,
        name: t.name.length > 60 ? t.name.substring(0, 57) + "..." : t.name,
        provider: `Torrent (${t.seeds}S/${t.peers}P)`,
        quality: t.quality,
        languages: ["en"],
        isEmbed: false,
        playUrl: null,
        providerId: `torrent_${t.quality.toLowerCase()}`,
      });
    }

    // Tier 3: Web scraper / embed fallback sources
    const scraperResult = await scrapeAll(numId, type, season, episode);
    for (const s of scraperResult.sources) {
      sources.push(s);
    }

    // Sort: prefer language match first, then highest quality
    if (lang) {
      sources.sort((a, b) => {
        if (a.isEmbed && !b.isEmbed) return 1;
        if (!a.isEmbed && b.isEmbed) return -1;
        const aMatch = a.languages?.includes(lang) ? 0 : 1;
        const bMatch = b.languages?.includes(lang) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return qualityScore(b.quality) - qualityScore(a.quality);
      });
    } else {
      sources.sort((a, b) => {
        if (a.isEmbed && !b.isEmbed) return 1;
        if (!a.isEmbed && b.isEmbed) return -1;
        return qualityScore(b.quality) - qualityScore(a.quality);
      });
    }

    const allSubtitles: SubtitleFile[] = directResult?.subtitles || [];

    res.json({
      tmdbId: numId,
      type,
      season,
      episode,

      sources,
      subtitles: allSubtitles,
    });
  } catch (err) {
    res.status(500).json({ error: "Media lookup failed", message: String(err) });
  }
});

languageRouter.get("/stream/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lang = (req.query.lang as string) || "en";
    const type = (req.query.type as "movie" | "tv") || "movie";

    let cached = getCachedLanguages(id);
    if (!cached) {
      cached = await scanMovie(id, type);
    }

    const file = getBestFileForLanguage(id, lang);
    if (!file) {
      res.status(404).json({ error: "No stream files found for this movie", tmdbId: id });
      return;
    }

    const containsTarget = cached.languages.includes(lang);

    res.json({
      tmdbId: id,
      url: file.url,
      name: file.name,
      languages: cached.languages,
      targetLanguage: containsTarget ? lang : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Stream lookup failed", message: String(err) });
  }
});

languageRouter.get("/play/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lang = (req.query.lang as string) || "en";
    const type = (req.query.type as "movie" | "tv") || "movie";

    let cached = getCachedLanguages(id);
    if (!cached) {
      cached = await scanMovie(id, type);
    }

    const file = getBestFileForLanguage(id, lang);
    if (!file) {
      res.status(404).json({ error: "No stream files found", tmdbId: id });
      return;
    }

    res.setHeader("Content-Type", "video/mp4");
    await streamRemuxedFile(file.directUrl, lang, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Playback failed", message: String(err) });
    }
  }
});

languageRouter.get("/scan/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const type = (req.query.type as "movie" | "tv") || "movie";
    const title = req.query.title as string | undefined;
    const year = req.query.year as string | undefined;
    const result = await scanMovie(id, type, title, year);
    res.json({ tmdbId: id, ...result });
  } catch (err) {
    res.status(500).json({ error: "Scan failed", message: String(err) });
  }
});

languageRouter.get("/transcode", async (req, res) => {
  try {
    const url = req.query.url as string | undefined;
    const lang = (req.query.lang as string) || "en";
    if (!url) {
      res.status(400).json({ error: "Missing url parameter" });
      return;
    }
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    await streamRemuxedFile(url, lang, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Transcode failed", message: String(err) });
    }
  }
});

languageRouter.get("/:id", (req, res) => {
  const { id } = req.params;
  const cached = getCachedLanguages(id);
  if (cached) {
    res.json({ tmdbId: id, ...cached });
  } else {
    res.status(404).json({ error: "Not scanned yet", tmdbId: id });
  }
});

languageRouter.post("/batch", (req, res) => {
  const { ids } = req.body as { ids: (string | number)[] };
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: "ids must be an array" });
    return;
  }
  const result = getBatchLanguages(ids);
  res.json(result);
});

function parseQuality(name: string): string {
  const m = name.match(/\b(2160p|1080p|720p|480p|360p|4[Kk])\b/);
  if (!m) return "HD";
  if (m[1].toLowerCase() === "4k") return "4K";
  return m[1];
}

function qualityScore(q: string): number {
  const map: Record<string, number> = { "4K": 5, "2160p": 5, "1080p": 4, "720p": 3, "480p": 2, "360p": 1, HD: 3 };
  return map[q] || 0;
}
