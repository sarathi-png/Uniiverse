import type { Request, Response } from "express";
import axios from "axios";
import { searchAllTorrents } from "./scrapers.js";

const http = axios.create({ timeout: 8000, validateStatus: () => true });

function getTmdbKey(): string {
  return process.env.TMDB_API_KEY || "";
}
const TPB_API = "https://apibay.org";
const EZTV_API = "https://eztvx.to/api";

const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://tracker.dler.org:6969/announce",
  "https://tracker.moeblog.cn:443/announce",
  "https://tracker.zhuqiy.com:443/announce",
  "udp://open.dstud.io:6969/announce",
];

export interface TorrentSource {
  magnet: string;
  name: string;
  quality: string;
  size: string;
  seeds: number;
  peers: number;
}

const imdbCache = new Map<string, string>();
const torrentAccess = new Map<string, number>();

let _client: any = null;
let _clientInitAttempted = false;

function getClient(): any {
  if (_client) return _client;
  if (_clientInitAttempted) return null;
  _clientInitAttempted = true;
  try {
    const WebTorrent = require("webtorrent");
    _client = new WebTorrent();
    return _client;
  } catch {
    return null;
  }
}

async function getMovieTitle(tmdbId: number): Promise<{ title: string; year?: string } | null> {
  try {
    const res = await http.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${getTmdbKey()}`);
    const data = res.data as { title?: string; release_date?: string };
    if (!data.title) return null;
    const year = data.release_date ? data.release_date.split("-")[0] : undefined;
    return { title: data.title, year };
  } catch {
    return null;
  }
}

async function getTVTitle(tmdbId: number): Promise<{ title: string; year?: string } | null> {
  try {
    const res = await http.get(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${getTmdbKey()}`);
    const data = res.data as { name?: string; first_air_date?: string };
    if (!data.name) return null;
    const year = data.first_air_date ? data.first_air_date.split("-")[0] : undefined;
    return { title: data.name, year };
  } catch {
    return null;
  }
}

function extractInfoHash(magnet: string): string | null {
  const decoded = decodeURIComponent(magnet);
  const m = decoded.match(/xt=urn:btih:([a-fA-F0-9]+)/i);
  return m ? m[1].toLowerCase() : null;
}

async function getImdbId(tmdbId: number, type: "movie" | "tv"): Promise<string | null> {
  const key = `${type}_${tmdbId}`;
  const cached = imdbCache.get(key);
  if (cached) return cached;

  try {
    const endpoint =
      type === "movie"
        ? `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids`
        : `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids`;
    const res = await http.get(`${endpoint}?api_key=${getTmdbKey()}`);
    const data = res.data as { imdb_id?: string };
    if (data.imdb_id) {
      imdbCache.set(key, data.imdb_id);
      return data.imdb_id;
    }
    return null;
  } catch {
    return null;
  }
}

function buildMagnet(infoHash: string, name: string): string {
  const parts: string[] = [];
  parts.push(`xt=urn:btih:${infoHash}`);
  parts.push(`dn=${encodeURIComponent(name)}`);
  for (const tr of TRACKERS) {
    parts.push(`tr=${encodeURIComponent(tr)}`);
  }
  return `magnet:?${parts.join("&")}`;
}

function parseQualityFromName(name: string): string {
  const m = name.match(/\b(2160p|1080p|720p|480p|360p|4[Kk])\b/);
  if (!m) return "HD";
  if (m[1].toLowerCase() === "4k") return "4K";
  return m[1];
}

export async function searchMovieTorrents(tmdbId: number): Promise<TorrentSource[]> {
  const [imdbId, meta] = await Promise.all([
    getImdbId(tmdbId, "movie"),
    getMovieTitle(tmdbId),
  ]);

  const results: TorrentSource[] = [];

  // 1. TPB by IMDb ID (most precise)
  if (imdbId) {
    try {
      const res = await http.get(`${TPB_API}/q.php?q=${imdbId}&cat=201`);
      const data = res.data as any[];
      if (Array.isArray(data)) {
        for (const t of data) {
          if (t.info_hash && t.name && Number(t.seeders) > 0) {
            results.push({
              magnet: buildMagnet(t.info_hash, t.name),
              name: t.name,
              quality: parseQualityFromName(t.name),
              size: formatSize(Number(t.size) || 0),
              seeds: Number(t.seeders) || 0,
              peers: Number(t.leechers) || 0,
            });
          }
        }
      }
    } catch {}
  }

  // 2. LimeTorrents + 1337x by title (wider coverage)
  if (meta) {
    const scraped = await searchAllTorrents(meta.title, meta.year);
    for (const t of scraped) {
      results.push({
        magnet: t.magnet,
        name: t.name,
        quality: t.quality,
        size: t.size,
        seeds: t.seeds,
        peers: t.peers,
      });
    }
  }

  // Deduplicate by info hash
  const seen = new Set<string>();
  return results
    .filter((t) => {
      const hash = extractInfoHash(t.magnet);
      if (!hash || seen.has(hash)) return false;
      seen.add(hash);
      return true;
    })
    .sort((a, b) => b.seeds - a.seeds);
}

export async function searchTVTorrents(
  tmdbId: number,
  season: number,
  episode: number
): Promise<TorrentSource[]> {
  const [imdbId, meta] = await Promise.all([
    getImdbId(tmdbId, "tv"),
    getTVTitle(tmdbId),
  ]);

  const results: TorrentSource[] = [];

  // 1. EZTV by IMDb ID (reliable for TV)
  if (imdbId) {
    try {
      const res = await http.get(`${EZTV_API}/get-torrents?imdb_id=${imdbId}&limit=50`);
      const data = res.data as { torrents?: any[] };
      if (data.torrents) {
        for (const t of data.torrents) {
          const s = Number(t.season);
          const e = Number(t.episode);
          if (s === season && e === episode && t.seeds > 0 && t.magnet_url) {
            results.push({
              magnet: t.magnet_url,
              name: t.filename || t.title || "",
              quality: parseQualityFromName(t.filename || t.title || ""),
              size: formatSize(Number(t.size_bytes) || 0),
              seeds: Number(t.seeds) || 0,
              peers: Number(t.peers) || 0,
            });
          }
        }
      }
    } catch {}
  }

  // 2. LimeTorrents + 1337x by title (fallback)
  if (meta) {
    const query = `${meta.title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
    const scraped = await searchAllTorrents(query, meta.year);
    for (const t of scraped) {
      results.push({
        magnet: t.magnet,
        name: t.name,
        quality: t.quality,
        size: t.size,
        seeds: t.seeds,
        peers: t.peers,
      });
    }
  }

  const seen = new Set<string>();
  return results
    .filter((t) => {
      const hash = extractInfoHash(t.magnet);
      if (!hash || seen.has(hash)) return false;
      seen.add(hash);
      return true;
    })
    .sort((a, b) => b.seeds - a.seeds);
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export async function handleTorrentStream(req: Request, res: Response): Promise<void> {
  const magnet = (req.query.magnet as string) || (req.query.m as string);
  if (!magnet) {
    res.status(400).json({ error: "Missing magnet parameter" });
    return;
  }

  try {
    const infoHash = extractInfoHash(magnet);
    if (!infoHash) {
      res.status(400).json({ error: "Invalid magnet URL" });
      return;
    }

    const c = getClient();
    if (!c) {
      if (!res.headersSent) res.status(503).json({ error: "Torrent engine unavailable on this Node version" });
      return;
    }

    torrentAccess.set(infoHash, Date.now());

    const existing = await c.get(infoHash);
    let torrent = existing || undefined;

    if (torrent && torrent.ready) {
      streamTorrentFile(torrent, req, res);
      return;
    }

    if (!torrent) {
      torrent = c.add(magnet, {});
    }

    if (torrent.ready) {
      torrentAccess.set(infoHash, Date.now());
      streamTorrentFile(torrent, req, res);
      return;
    }

    const metaTimeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: "Torrent metadata timeout — no peers or invalid magnet" });
      }
    }, 30000);

    torrent.once("metadata", () => {
      clearTimeout(metaTimeout);
      if (torrent) {
        torrentAccess.set(infoHash, Date.now());
        streamTorrentFile(torrent, req, res);
      }
    });

    torrent.once("error", (err: Error) => {
      clearTimeout(metaTimeout);
      if (!res.headersSent) {
        res.status(502).json({ error: "Torrent error", message: err.message });
      }
    });

    torrent.on("warning", () => {});
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Stream failed", message: String(err) });
    }
  }
}

// Wrap the torrent play handler so WebTorrent microtask crashes don't leak up
export function safeTorrentStream(req: Request, res: Response): void {
  handleTorrentStream(req, res).catch((err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: "Torrent stream error", message: String(err) });
    }
  });
}

function streamTorrentFile(torrent: any, req: Request, res: Response): void {
  const videoFiles = torrent.files.filter((f: any) =>
    /\.(mp4|mkv|avi|webm|m4v)$/i.test(f.name)
  );

  if (videoFiles.length === 0) {
    res.status(404).json({ error: "No video files in torrent" });
    return;
  }

  videoFiles.sort((a: any, b: any) => b.length - a.length);
  const file = videoFiles[0];
  const fileSize = file.length;

  const range = req.headers.range;
  let start = 0;
  let end = fileSize - 1;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    start = parseInt(parts[0], 10);
    if (!isNaN(start)) {
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (isNaN(end)) end = fileSize - 1;
    } else {
      start = 0;
    }
  }

  const chunkSize = end - start + 1;
  res.writeHead(range && !isNaN(start) ? 206 : 200, {
    "Content-Type": "video/mp4",
    "Content-Length": chunkSize,
    "Accept-Ranges": "bytes",
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Cache-Control": "no-cache",
  });

  const stream = file.createReadStream({ start, end });
  stream.pipe(res);
  stream.on("error", () => {
    if (!res.headersSent) res.end();
  });
}

export function cleanupTorrents(maxAgeMs = 30 * 60 * 1000): void {
  const c = getClient();
  if (!c) return;
  const now = Date.now();
  const toRemove: string[] = [];

  for (const torrent of c.torrents) {
    const hash = torrent.infoHash;
    if (!hash) continue;
    const lastAccess = torrentAccess.get(hash);
    if (lastAccess && now - lastAccess > maxAgeMs) {
      toRemove.push(hash);
    }
  }

  for (const hash of toRemove) {
    c.remove(hash);
    torrentAccess.delete(hash);
  }
}

export function getActiveTorrentCount(): number {
  const c = getClient();
  return c ? c.torrents.length : 0;
}
