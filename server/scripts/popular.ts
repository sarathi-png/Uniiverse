import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE = "https://api.themoviedb.org/3";

interface TetraxDb {
  [key: string]: [string, "movie" | "tv", string | null];
}

interface PopularItem {
  title: string;
  year: number;
  tmdbId: number;
  type: "movie" | "tv";
  popularity: number;
  posterPath: string | null;
}

function loadTetrax(): TetraxDb {
  const p = resolve(DATA_DIR, "tetrax-tmdb.json");
  if (!existsSync(p)) {
    console.error("tetrax-tmdb.json not found.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf-8"));
}

function stripTitle(title: string): string {
  return title.replace(/'/g, "").replace(/[^a-z0-9\s]/gi, "").trim().toLowerCase();
}

function jaccard(a: string, b: string): number {
  const aWords = new Set(a.split(/\s+/));
  const bWords = b.split(/\s+/);
  const intersection = [...aWords].filter((w) => bWords.includes(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union > 0 ? intersection / union : 0;
}

function matchToTetrax(title: string, year: number, db: TetraxDb): [number | null, "movie" | "tv"] {
  const cleanTitle = stripTitle(title);

  const exactHits: [number, number, "movie" | "tv"][] = [];
  for (const [key, val] of Object.entries(db)) {
    const [dbTitleRaw, dbYearRaw] = key.split("|");
    const dbTitle = stripTitle(dbTitleRaw);
    const dbYear = parseInt(dbYearRaw);
    if (year && dbYear === year) {
      const score = jaccard(cleanTitle, dbTitle);
      if (score >= 0.5) exactHits.push([score, parseInt(val[0]), val[1]]);
    }
  }
  if (exactHits.length > 0) {
    exactHits.sort((a, b) => b[0] - a[0]);
    return [exactHits[0][1], exactHits[0][2]];
  }

  const offsetHits: [number, number, "movie" | "tv"][] = [];
  for (const [key, val] of Object.entries(db)) {
    const [dbTitleRaw, dbYearRaw] = key.split("|");
    const dbTitle = stripTitle(dbTitleRaw);
    const dbYear = parseInt(dbYearRaw);
    if (year && Math.abs(dbYear - year) <= 1) {
      const score = jaccard(cleanTitle, dbTitle);
      if (score >= 0.6) offsetHits.push([score, parseInt(val[0]), val[1]]);
    }
  }
  if (offsetHits.length > 0) {
    offsetHits.sort((a, b) => b[0] - a[0]);
    return [offsetHits[0][1], offsetHits[0][2]];
  }

  return [null, "movie"];
}

interface TMDBResult {
  id: number;
  title: string;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, { headers: { accept: "application/json" } }, (res: any) => {
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function fetchPage(endpoint: string, page: number): Promise<TMDBResult[]> {
  const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_API_KEY}&page=${page}`;
  const raw = await httpGet(url);
  if (!raw) return [];
  const data = JSON.parse(raw);
  return data.results || [];
}

async function fetchPoster(tmdbId: number, type: string): Promise<string | null> {
  const endpoint = type === "tv" ? "tv" : "movie";
  try {
    const url = `${TMDB_BASE}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const raw = await httpGet(url);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.poster_path || null;
  } catch {
    return null;
  }
}

async function main() {
  const tetrax = loadTetrax();
  const matched: PopularItem[] = [];
  const seen = new Set<number>();

  console.log("Fetching TMDB popular + top_rated...");

  for (const endpoint of ["movie/popular", "movie/top_rated", "trending/movie/week", "movie/now_playing"]) {
    const maxPages = endpoint === "trending/movie/week" ? 5 : 50;
    for (let page = 1; page <= maxPages; page++) {
      try {
        const movies = await fetchPage(endpoint, page);
        let found = 0;
        for (const movie of movies) {
          if (seen.has(movie.id)) continue;
          seen.add(movie.id);

          const dateStr = movie.release_date || movie.first_air_date || "";
          const year = dateStr ? parseInt(dateStr.slice(0, 4)) : 0;
          const [tmdbId, mediaType] = matchToTetrax(movie.title, year, tetrax);

          if (tmdbId) {
            matched.push({
              title: movie.title,
              year,
              tmdbId,
              type: mediaType,
              popularity: movie.popularity,
              posterPath: null,
            });
            found++;
          }
        }
        console.log(`  ${endpoint} page ${page}: ${movies.length} movies, ${found} new matches (${matched.length} total)`);
      } catch (e: any) {
        console.error(`  ${endpoint} page ${page} failed: ${e.message}`);
      }
      if (matched.length >= 300) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (matched.length >= 300) break;
  }

  const byId = new Map<number, PopularItem>();
  for (const item of matched) {
    const existing = byId.get(item.tmdbId);
    if (!existing || item.popularity > existing.popularity) {
      byId.set(item.tmdbId, item);
    }
  }

  const sorted = [...byId.values()].sort((a, b) => b.popularity - a.popularity);
  const top200 = sorted.slice(0, 200);

  console.log(`\nFetching poster paths for ${top200.length} titles...`);

  // Fetch poster paths concurrently (10 at a time)
  let done = 0;
  for (let i = 0; i < top200.length; i += 10) {
    const batch = top200.slice(i, i + 10);
    await Promise.all(
      batch.map(async (item) => {
        const path = await fetchPoster(item.tmdbId, item.type);
        item.posterPath = path;
      })
    );
    done += batch.length;
    console.log(`  Posters: ${done}/${top200.length}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  const outPath = resolve(DATA_DIR, "popular-seed.json");
  writeFileSync(outPath, JSON.stringify(top200, null, 2), "utf-8");
  console.log(`\nSaved ${top200.length} popular Tamil-dubbed titles with posters to popular-seed.json`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
