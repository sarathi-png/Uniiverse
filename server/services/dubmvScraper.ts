import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

export interface DubmvEntry {
  fileId: number;
  title: string;
  year: number;
  tmdbId: number | null;
  type: "movie" | "tv";
  posterUrl: string | null;
  directUrl: string;
  downloadUrl: string | null;
  fileSize: string | null;
  duration: string | null;
  format: string | null;
  quality: string;
  addedAt: string;
}

interface TetraxDb {
  [key: string]: [string, "movie" | "tv", string | null];
}

let tetraxDb: TetraxDb | null = null;
let dubmvCache: DubmvEntry[] | null = null;

function loadTetraxDb(): TetraxDb {
  if (tetraxDb) return tetraxDb;
  const p = resolve(DATA_DIR, "tetrax-tmdb.json");
  if (!existsSync(p)) {
    console.warn("[dubmvScraper] tetrax-tmdb.json not found — TMDB matching disabled");
    tetraxDb = {};
    return tetraxDb;
  }
  tetraxDb = JSON.parse(readFileSync(p, "utf-8")) as TetraxDb;
  console.log(`[dubmvScraper] Loaded ${Object.keys(tetraxDb!).length} TetraX references`);
  return tetraxDb!;
}

function loadCache(): DubmvEntry[] {
  if (dubmvCache) return dubmvCache;
  const p = resolve(DATA_DIR, "tamil-dubbed.json");
  if (!existsSync(p)) {
    dubmvCache = [];
    return dubmvCache;
  }
  dubmvCache = JSON.parse(readFileSync(p, "utf-8")) as DubmvEntry[];
  return dubmvCache!;
}

function saveCache(): void {
  const p = resolve(DATA_DIR, "tamil-dubbed.json");
  writeFileSync(p, JSON.stringify(dubmvCache, null, 2), "utf-8");
  console.log(`[dubmvScraper] Saved ${dubmvCache!.length} entries to tamil-dubbed.json`);
}

const QUALITY_PATTERNS =
  /\b(2160p|1080p|720p|480p|360p|4k|4K|HD|HDRip|WEBRip|WEB-DL|BRRip|BluRay|Bluray|DVDRip|HC|HDRip|AMZN|NF)\b/g;
const PAREN_YEAR = /\s*\(\d{4}\)\s*/g;
const EXTRA_YEAR = /\s+\d{4}\s*$/;

function stripQualityNoise(title: string): string {
  return title
    .replace(QUALITY_PATTERNS, "")
    .replace(PAREN_YEAR, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const QUALITY_RANK: Record<string, number> = {
  "2160p": 6, "4K": 6, "4k": 6,
  "1080p": 5,
  "720p": 4,
  "480p": 3,
  "360p": 2,
  "HD": 1,
};

function parseQuality(name: string): string {
  const m = name.match(/\b(2160p|1080p|720p|480p|360p|4[Kk])\b/);
  if (!m) return "HD";
  if (m[1].toLowerCase() === "4k") return "4K";
  return m[1];
}

function qualityScore(q: string): number {
  return QUALITY_RANK[q] ?? 0;
}

const EPISODE_NOISE = /\s+(S(eason)?\s*\d{1,2}|Epi\s*\d{1,3}|Episode\s*\d{1,3}|Season\s*\d{1,2})\s*(\(Epi\s*\d{1,3}\))?/gi;

function normalizeTitle(raw: string): string {
  return raw
    .replace(/^isaiDub\.(io|me)\s*-\s*/i, "")
    .replace(EPISODE_NOISE, " ")
    .replace(/\s*\(\s*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYear(title: string): number | null {
  const m = title.match(/\b(19\d{2}|20\d{2})\b/);
  return m ? parseInt(m[1]) : null;
}

function matchToTmdb(title: string, year: number | null): [number | null, "movie" | "tv"] {
  const db = loadTetraxDb();
  const cleanTitle = stripQualityNoise(title)
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .trim()
    .toLowerCase();

  for (const [key, val] of Object.entries(db)) {
    const [dbTitleRaw, dbYearRaw] = key.split("|");
    const dbTitle = dbTitleRaw
      .replace(/'/g, "")
      .replace(/[^a-z0-9\s]/gi, "")
      .trim()
      .toLowerCase();
    const dbYear = parseInt(dbYearRaw);

    if (year && dbYear !== year) continue;

    const tWords = new Set(cleanTitle.split(/\s+/));
    const dWords = dbTitle.split(/\s+/);
    const intersection = [...tWords].filter((w) => dWords.includes(w)).length;
    const union = new Set([...tWords, ...dWords]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    if (jaccard >= 0.6) {
      return [parseInt(val[0]), val[1]];
    }
  }
  return [null, "movie"];
}

export async function scrapeSingleFile(fileId: number): Promise<DubmvEntry | null> {
  const url = `https://dubmv.xyz/download/file/${fileId}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const titleMatch = html.match(/<title>Download File:\s*(.*?)<\/title>/i);
    if (!titleMatch) return null;
    const rawTitle = titleMatch[1].trim();
    const normalizedTitle = normalizeTitle(rawTitle);
    const year = extractYear(normalizedTitle);

    const sizeMatch = html.match(/<(?:strong|b)[^>]*>\s*File\s*Size\s*<\/(?:strong|b)>\s*<(?:td|span|div)[^>]*>\s*([^<]+)/i)
      || html.match(/File\s*Size[:\s]*<[^>]*>([^<]+)/i);
    const durationMatch = html.match(/<(?:strong|b)[^>]*>\s*Duration\s*<\/(?:strong|b)>\s*<(?:td|span|div)[^>]*>\s*([^<]+)/i)
      || html.match(/Duration[:\s]*<[^>]*>([^<]+)/i);
    const formatMatch = html.match(/<(?:strong|b)[^>]*>\s*Format\s*<\/(?:strong|b)>\s*<(?:td|span|div)[^>]*>\s*([^<]+)/i)
      || html.match(/Format[:\s]*<[^>]*>([^<]+)/i);

    const watchLinks: string[] = [];
    const downloadLinks: string[] = [];
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      if (href.includes("dub.onestream.today/stream/video/")) {
        watchLinks.push(href);
      } else if (href.includes("dubshare.one/")) {
        downloadLinks.push(href);
      }
    }

    if (watchLinks.length === 0) return null;

    const directUrl = watchLinks[0];
    const downloadUrl = downloadLinks[0] || null;

    const cleanForMatch = stripQualityNoise(normalizedTitle).replace(EXTRA_YEAR, "").trim();
    const [tmdbId, mediaType] = matchToTmdb(cleanForMatch, year);

    const quality = parseQuality(normalizedTitle);

    const cleanTitle = stripQualityNoise(normalizedTitle)
      .replace(EXTRA_YEAR, "")
      .trim();

    const slug = cleanTitle.replace(/\s+/g, "-").toLowerCase();

    return {
      fileId,
      title: cleanTitle,
      year: year || new Date().getFullYear(),
      tmdbId,
      type: mediaType,
      posterUrl: `https://isaidub.guru/uploads/shots/${fileId}-${encodeURIComponent(slug)}.jpg`,
      directUrl,
      downloadUrl,
      fileSize: sizeMatch ? sizeMatch[1].trim() : null,
      duration: durationMatch ? durationMatch[1].trim() : null,
      format: formatMatch ? formatMatch[1].trim() : null,
      quality,
      addedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function seedFromIds(ids: number[]): Promise<number> {
  loadCache();
  const existing = new Set(dubmvCache!.map((e) => e.fileId));
  let added = 0;

  for (const id of ids) {
    if (existing.has(id)) continue;
    const entry = await scrapeSingleFile(id);
    if (entry) {
      dubmvCache!.push(entry);
      added++;
      console.log(`  [${id}] ${entry.title} (${entry.year}) — tmdb:${entry.tmdbId}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  deduplicateByQuality();
  saveCache();
  return added;
}

export async function crawlRange(start: number, end: number, concurrency = 5): Promise<number> {
  loadCache();
  const existing = new Set(dubmvCache!.map((e) => e.fileId));
  let added = 0;

  const worker = async (id: number) => {
    if (existing.has(id)) return;
    const entry = await scrapeSingleFile(id);
    if (entry) {
      dubmvCache!.push(entry);
      added++;
      console.log(`  [${id}] ${entry.title} (${entry.year}, ${entry.quality}) — tmdb:${entry.tmdbId}`);

      // flush every 50 new entries
      if (added % 50 === 0) saveCache();
    }
  };

  const queue: number[] = [];
  for (let i = start; i <= end; i++) {
    queue.push(i);
  }

  for (let i = 0; i < queue.length; i += concurrency) {
    const batch = queue.slice(i, i + concurrency);
    await Promise.allSettled(batch.map(worker));
    if (i + concurrency < queue.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  deduplicateByQuality();
  saveCache();
  return added;
}

function deduplicateByQuality(): void {
  loadCache();
  const best = new Map<string, DubmvEntry>();

  for (const entry of dubmvCache!) {
    const key = `${entry.title}|${entry.year}|${entry.type}`;
    const existing = best.get(key);
    if (!existing || qualityScore(entry.quality) > qualityScore(existing.quality)) {
      best.set(key, entry);
    }
  }

  dubmvCache = [...best.values()];
}

export function getAllEntries(): DubmvEntry[] {
  return loadCache();
}

export function getEntryByFileId(fileId: number): DubmvEntry | undefined {
  return loadCache().find((e) => e.fileId === fileId);
}

export function getMatchedEntries(): DubmvEntry[] {
  return loadCache().filter((e) => e.tmdbId !== null);
}

export function addEntry(entry: DubmvEntry): void {
  loadCache();
  dubmvCache!.push(entry);
  deduplicateByQuality();
  saveCache();
}

export interface PopularSeedItem {
  title: string;
  year: number;
  tmdbId: number;
  type: string;
  popularity: number;
  posterPath: string | null;
}

export function loadPopularSeed(): PopularSeedItem[] {
  const p = resolve(DATA_DIR, "popular-seed.json");
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf-8")) as PopularSeedItem[];
}

if (process.argv[1] && process.argv[1].includes("dubmvScraper")) {
  const command = process.argv[2];
  if (command === "seed" && process.argv[3]) {
    const ids = process.argv[3].split(",").map(Number);
    seedFromIds(ids).then((n) => {
      console.log(`\nDone. Added ${n} entries.`);
      process.exit(0);
    });
  } else if (command === "crawl" && process.argv[3] && process.argv[4]) {
    const start = parseInt(process.argv[3]);
    const end = parseInt(process.argv[4]);
    crawlRange(start, end).then((n) => {
      console.log(`\nDone. Added ${n} entries from range ${start}-${end}.`);
      process.exit(0);
    });
  } else {
    console.log(`
Usage:
  tsx server/services/dubmvScraper.ts seed <id1,id2,...>
  tsx server/services/dubmvScraper.ts crawl <startId> <endId>
    `);
  }
}
