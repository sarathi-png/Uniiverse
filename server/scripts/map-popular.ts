import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

const BASE = "https://isaidub.guru";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

interface SeedItem {
  title: string;
  year: number;
  tmdbId: number;
  type: string;
  popularity: number;
  posterPath: string | null;
}

interface MappingItem {
  tmdbId: number;
  title: string;
  year: number;
  type: string;
  fileId: number | null;
  movieId: number | null;
  posterPath: string | null;
}

function loadSeed(): SeedItem[] {
  const p = resolve(DATA_DIR, "popular-seed.json");
  return JSON.parse(readFileSync(p, "utf-8"));
}

function loadMap(): MappingItem[] {
  const p = resolve(DATA_DIR, "popular-mapped.json");
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf-8"));
}

function saveMap(map: MappingItem[]) {
  const p = resolve(DATA_DIR, "popular-mapped.json");
  writeFileSync(p, JSON.stringify(map, null, 2), "utf-8");
  console.log(`  [save] ${map.length} mappings written`);
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": UA },
      });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  return null;
}

async function mapItem(item: SeedItem): Promise<MappingItem> {
  const base: MappingItem = {
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
    type: item.type,
    fileId: null,
    movieId: null,
    posterPath: item.posterPath,
  };

  const slugs = [
    `${slugify(item.title)}-${item.year}-tamil-dubbed-movie/`,
    `${slugify(item.title)}-tamil-dubbed-movie/`,
  ];

  for (const slug of slugs) {
    const html = await fetchHtml(`${BASE}/movie/${slug}`);
    if (!html) continue;

    const $ = cheerio.load(html);
    const movieLinks: string[] = [];

    $(`a[href]`).each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/\/movie\/(\d+)\//);
      if (m) movieLinks.push(m[1]);
    });

    if (movieLinks.length === 0) continue;

    const movieId = parseInt(movieLinks[0]);
    base.movieId = movieId;

    // Fetch the movie detail page to find download file IDs
    const movieHtml = await fetchHtml(`${BASE}/movie/${movieId}/`);
    if (!movieHtml) continue;

    const $2 = cheerio.load(movieHtml);
    const fileIds: number[] = [];

    $2(`a[href]`).each((_, el) => {
      const href = $2(el).attr("href") || "";
      const m = href.match(/\/download\/page\/(\d+)\//);
      if (m) fileIds.push(parseInt(m[1]));
    });

    if (fileIds.length > 0) {
      // Prefer highest file ID (typically latest/highest quality)
      base.fileId = Math.max(...fileIds);
    }

    return base;
  }

  return base;
}

async function main() {
  const seed = loadSeed();
  const existing = loadMap();
  const mappedTmdb = new Set(existing.map((m) => m.tmdbId));

  console.log(`[map] ${seed.length} popular items, ${existing.length} already mapped`);

  let found = existing.filter((m) => m.fileId !== null).length;
  let notFound = existing.filter((m) => m.fileId === null).length;
  let skipped = 0;

  for (let i = 0; i < seed.length; i++) {
    const item = seed[i];
    if (mappedTmdb.has(item.tmdbId)) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${seed.length}] ${item.title} (${item.year})... `);

    const result = await mapItem(item);
    existing.push(result);

    if (result.fileId) {
      found++;
      console.log(`OK → fileId=${result.fileId}, movieId=${result.movieId}`);
    } else {
      notFound++;
      console.log(`MISS`);
    }

    // Save every 10 items
    if ((i + 1) % 10 === 0) saveMap(existing);

    // Delay to be polite
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
  }

  saveMap(existing);
  console.log(`\nDone. Found: ${found}, Not found: ${notFound}, Skipped: ${skipped}`);
  process.exit(0);
}

main();
