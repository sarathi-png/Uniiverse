import { Router } from "express";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { DubmvEntry } from "../services/dubmvScraper.js";
import {
  getAllEntries,
  getEntryByFileId,
  getMatchedEntries,
  scrapeSingleFile,
  loadPopularSeed,
  addEntry,
} from "../services/dubmvScraper.js";

export const dubmvRouter = Router();

const ITEMS_PER_PAGE = 30;

dubmvRouter.get("/list", (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || ITEMS_PER_PAGE));
    const type = req.query.type as string | undefined;
    const search = (req.query.search as string || "").toLowerCase().trim();
    const matchedOnly = req.query.matched !== "false";

    let entries = matchedOnly ? getMatchedEntries() : getAllEntries();

    if (type === "movie" || type === "tv") {
      entries = entries.filter((e) => e.type === type);
    }

    if (search) {
      entries = entries.filter((e) => e.title.toLowerCase().includes(search));
    }

    entries.sort((a, b) => b.fileId - a.fileId);

    const total = entries.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = entries.slice(start, start + limit);

    res.json({
      page,
      totalPages,
      total,
      items,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to list Tamil dubbed content", message: String(err) });
  }
});

dubmvRouter.get("/lookup/:fileId", (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const entry = getEntryByFileId(fileId);
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: "Lookup failed", message: String(err) });
  }
});

dubmvRouter.get("/scrape/:fileId", async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const entry = await scrapeSingleFile(fileId);
    if (!entry) {
      res.status(404).json({ error: "No content found at that ID" });
      return;
    }
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: "Scrape failed", message: String(err) });
  }
});

dubmvRouter.get("/popular", (_req, res) => {
  try {
    const seed = loadPopularSeed();
    const cached = getAllEntries();
    const cachedByTmdb = new Map<number, DubmvEntry>();
    for (const e of cached) {
      if (e.tmdbId) cachedByTmdb.set(e.tmdbId, e);
    }

    const items = seed.map((s) => {
      const found = cachedByTmdb.get(s.tmdbId);
      const tmdbPoster = s.posterPath ? `https://image.tmdb.org/t/p/w342${s.posterPath}` : null;
      const bestPoster = tmdbPoster || found?.posterUrl || null;
      return {
        ...s,
        directUrl: found?.directUrl || null,
        fileId: found?.fileId || null,
        quality: found?.quality || null,
        cached: !!found,
        posterUrl: bestPoster,
      };
    });

    res.json({ total: items.length, items });
  } catch (err) {
    res.status(500).json({ error: "Failed to load popular list", message: String(err) });
  }
});

// Also cache scraped entries for future use
dubmvRouter.post("/scrape/:fileId", async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const entry = await scrapeSingleFile(fileId);
    if (!entry) {
      res.status(404).json({ error: "No content found at that ID" });
      return;
    }
    addEntry(entry);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: "Scrape failed", message: String(err) });
  }
});

dubmvRouter.get("/proxy/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const streamUrl = `https://dub.onestream.today/stream/video/${fileId}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://dubmv.xyz/",
    };

    // Step 1: fetch the player HTML page
    const pageRes = await fetch(streamUrl, { headers });
    if (!pageRes.ok) {
      res.status(pageRes.status).send("Stream page fetch failed");
      return;
    }
    const html = await pageRes.text();

    // Step 2: extract the actual video source URL from <source src="...">
    const srcMatch = html.match(/<source\s+src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) {
      res.status(502).send("No video source found in stream page");
      return;
    }
    const videoUrl = srcMatch[1];

    // Step 3: build upstream headers, forwarding Range from client
    const videoHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://dub.onestream.today/",
    };
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      videoHeaders["Range"] = Array.isArray(rangeHeader) ? rangeHeader[0] : rangeHeader;
    }

    // Step 4: fetch the actual video with range-awareness
    const videoRes = await fetch(videoUrl, { headers: videoHeaders });

    if (!videoRes.ok && videoRes.status !== 206) {
      res.status(videoRes.status).send("Video source fetch failed");
      return;
    }

    // Step 5: forward response headers needed for seeking
    const contentType = videoRes.headers.get("content-type") || "video/mp4";
    res.setHeader("Content-Type", contentType);

    const contentRange = videoRes.headers.get("content-range");
    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }
    const contentLength = videoRes.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    res.setHeader("Accept-Ranges", "bytes");
    res.status(videoRes.status); // 200 for full, 206 for partial

    await pipeline(Readable.fromWeb(videoRes.body as any), res);
  } catch (err) {
    res.status(500).json({ error: "Stream proxy failed", message: String(err) });
  }
});

dubmvRouter.get("/count", (_req, res) => {
  try {
    const all = getAllEntries();
    const matched = getMatchedEntries();
    res.json({
      total: all.length,
      matched: matched.length,
      movies: all.filter((e) => e.type === "movie").length,
      tv: all.filter((e) => e.type === "tv").length,
    });
  } catch (err) {
    res.status(500).json({ error: "Count failed", message: String(err) });
  }
});
