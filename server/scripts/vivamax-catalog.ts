import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");
const CATALOG_PATH = resolve(DATA_DIR, "vivamax-catalog.json");

const BASE = "https://bibamax.cc";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

export interface VivamaxEntry {
  slug: string;
  title: string;
  year: number | null;
  tmdbId: number | null;
  posterUrl: string | null;
  rating: number | null;
  quality: string;
  overview: string | null;
  adult: boolean;
}

function saveCatalog(entries: VivamaxEntry[]): void {
  writeFileSync(CATALOG_PATH, JSON.stringify(entries, null, 2), "utf-8");
  console.log(`Saved ${entries.length} entries to vivamax-catalog.json`);
}

function parseSlug(href: string): string {
  return href.replace(/\/+$/, "").trim();
}

function parseYear(dateText: string): number | null {
  const m = dateText.match(/(\d{4})/);
  return m ? parseInt(m[1]) : null;
}

export async function scrapeCatalog(): Promise<VivamaxEntry[]> {
  const allEntries: VivamaxEntry[] = [];
  const { load } = await import("cheerio");

  for (let page = 1; page <= 100; page++) {
    const url = `${BASE}/movies/page/${page}/`;
    console.log(`Page ${page}: ${url}...`);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.warn(`  HTTP ${res.status}, stopping`);
        break;
      }
      const html = await res.text();
      const $ = load(html);

      const articles = $("article.item.movies");
      if (articles.length === 0) {
        console.log("  No more articles found, done.");
        break;
      }

      let count = 0;
      articles.each((_: any, el: any) => {
        const $el = $(el);
        const href = $el.find(".poster a").attr("href") || "";
        const slug = parseSlug(href);
        if (!slug) return;

        const title = $el.find(".data h3 a").text().trim();
        if (!title) return;

        const dateSpan = $el.find(".data span").text().trim();
        const year = parseYear(dateSpan);

        const img = $el.find(".poster img").first();
        const posterUrl = img.attr("src") || img.attr("data-src") || null;

        const ratingStr = $el.find(".poster .rating").text().trim().replace(/[^\d.]/g, "");
        const rating = ratingStr ? parseFloat(ratingStr) : null;

        const quality = $el.find(".poster .quality, .mepo .quality").first().text().trim() || "HD";

        allEntries.push({
          slug,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          year,
          tmdbId: null,
          posterUrl: posterUrl?.startsWith("http") ? posterUrl : null,
          rating,
          quality,
          overview: null,
          adult: true,
        });
        count++;
      });

      console.log(`  ${count} entries (total: ${allEntries.length})`);
      if (count === 0) break;

      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn(`  Error: ${err}`);
      break;
    }
  }

  const seen = new Set<string>();
  const deduped = allEntries.filter((e) => {
    if (seen.has(e.slug)) return false;
    seen.add(e.slug);
    return true;
  });

  saveCatalog(deduped);
  return deduped;
}

if (process.argv[1]?.includes("vivamax-catalog")) {
  scrapeCatalog().then((entries) => {
    console.log(`\nDone. ${entries.length} unique entries.`);
    process.exit(0);
  });
}
