import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { scrapeSingleFile, addEntry, getAllEntries } from "../services/dubmvScraper.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

const OLD_RANGE_START = 100000;
const OLD_RANGE_END = 100200;

interface MappingItem {
  tmdbId: number;
  title: string;
  year: number;
  type: string;
  fileId: number | null;
  movieId: number | null;
  posterPath: string | null;
}

function loadMapped(): MappingItem[] {
  const p = resolve(DATA_DIR, "popular-mapped.json");
  return JSON.parse(readFileSync(p, "utf-8"));
}

async function main() {
  const mapped = loadMapped();
  const valid = mapped.filter((m) => m.fileId !== null);
  console.log(`[batch] ${valid.length}/${mapped.length} have fileIds to cache`);

  let scraped = 0;
  let failed = 0;
  let skipped = 0;

  const existing = getAllEntries();
  const existingIds = new Set(existing.map((e) => e.fileId));

  for (let i = 0; i < valid.length; i++) {
    const item = valid[i];
    const fileId = item.fileId!;

    if (existingIds.has(fileId)) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${valid.length}] ${item.title} (${item.year}) — fileId=${fileId}... `);

    const entry = await scrapeSingleFile(fileId);
    if (!entry) {
      failed++;
      console.log(`FAIL`);
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    // Patch with TMDB poster
    if (item.posterPath) {
      entry.posterUrl = `https://image.tmdb.org/t/p/w342${item.posterPath}`;
    }

    // Ensure tmdbId is set from our mapping
    if (!entry.tmdbId && item.tmdbId) {
      entry.tmdbId = item.tmdbId;
    }

    addEntry(entry);
    scraped++;
    console.log(`OK — ${entry.title}, ${entry.quality}`);

    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));
  }

  // Remove old wrong entries from initial crawl (100000-100200)
  const afterAdd = getAllEntries();
  const cleaned = afterAdd.filter(
    (e) => e.fileId < OLD_RANGE_START || e.fileId > OLD_RANGE_END
  );
  const removedCount = afterAdd.length - cleaned.length;

  if (removedCount > 0) {
    const dbPath = resolve(DATA_DIR, "tamil-dubbed.json");
    writeFileSync(dbPath, JSON.stringify(cleaned, null, 2), "utf-8");
    console.log(`\n[clean] Removed ${removedCount} old entries from range ${OLD_RANGE_START}-${OLD_RANGE_END}`);
  }

  console.log(`\nDone. Scraped: ${scraped}, Failed: ${failed}, Skipped: ${skipped}, Removed old: ${removedCount}`);
  process.exit(0);
}

main();
