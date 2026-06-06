import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");
const CATALOG_PATH = resolve(DATA_DIR, "vivamax-catalog.json");

const BASE = "https://bibamax.cc";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

interface CatalogEntry {
  slug: string;
  title: string;
}

interface EmbedEntry {
  slug: string;
  embedUrl: string | null;
  embedType: string | null;
}

function saveProgress(p: string, data: EmbedEntry[]) {
  writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

function loadCatalog(): CatalogEntry[] {
  if (!existsSync(CATALOG_PATH)) return [];
  return JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as CatalogEntry[];
}

function fetchText(url: string, extra: Record<string, string> = {}): Promise<string> {
  return fetch(url, {
    headers: { "User-Agent": UA, ...extra },
    signal: AbortSignal.timeout(15000),
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });
}

export async function scrapeEmbeds(limit = -1): Promise<EmbedEntry[]> {
  const catalog = loadCatalog();
  if (catalog.length === 0) {
    console.log("No catalog found. Run vivamax-catalog.ts first.");
    return [];
  }

  let embeds: EmbedEntry[] = [];
  const p = resolve(DATA_DIR, "vivamax-embeds.json");
  if (existsSync(p)) {
    embeds = JSON.parse(readFileSync(p, "utf-8")) as EmbedEntry[];
  }
  const existing = new Set(embeds.filter((e) => e.embedUrl).map((e) => e.slug));
  let added = 0;

  const maxEntries = limit > 0 ? Math.min(limit, catalog.length) : catalog.length;

  for (let i = 0; i < maxEntries; i++) {
    const entry = catalog[i];
    if (existing.has(entry.slug)) continue;

    // Extract last path segment as slug
    const pathSlug = entry.slug.split("/").pop() || entry.slug;
    const movieUrl = `${BASE}/movies/${pathSlug}/`;
    console.log(`[${i + 1}/${maxEntries}] ${entry.title}...`);

    try {
      // 1. Fetch movie page
      const html = await fetchText(movieUrl, { Referer: `${BASE}/` });
      if (html.length < 100) {
        console.warn(`  Empty response`);
        embeds.push({ slug: entry.slug, embedUrl: null, embedType: null });
        continue;
      }

      // Extract post ID
      const postIdMatch = html.match(/post-(\d+)/);
      const postId = postIdMatch ? postIdMatch[1] : null;
      if (!postId) {
        console.warn(`  No post ID found`);
        embeds.push({ slug: entry.slug, embedUrl: null, embedType: null });
        continue;
      }

      // 2. Call Dooplay player AJAX
      const text = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          Referer: movieUrl,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `action=doo_player_ajax&post=${postId}&nume=1&type=movie`,
        signal: AbortSignal.timeout(15000),
      }).then((r) => r.text());

      if (!text) {
        console.warn(`  Empty AJAX response`);
        embeds.push({ slug: entry.slug, embedUrl: null, embedType: null });
        continue;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn(`  AJAX non-JSON: ${text.slice(0, 60)}`);
        embeds.push({ slug: entry.slug, embedUrl: null, embedType: null });
        continue;
      }

      if (!data?.embed_url) {
        console.warn(`  No embed URL`);
        embeds.push({ slug: entry.slug, embedUrl: null, embedType: null });
        continue;
      }

      // Extract actual URL from embed code
      let embedUrl: string | null = null;
      const htmlStr = data.embed_url;
      if (typeof htmlStr === "string") {
        const m = htmlStr.match(/src=["']([^"']+)["']/);
        embedUrl = m ? m[1] : htmlStr.startsWith("http") ? htmlStr : null;
      }

      let embedType: string | null = null;
      if (embedUrl) {
        if (embedUrl.includes("xtremestream.xyz")) embedType = "xtremestream";
        else if (embedUrl.includes("magixz.com")) embedType = "mp4";
        else if (embedUrl.includes("streamtape")) embedType = "streamtape";
        else if (embedUrl.includes("mp4upload")) embedType = "mp4upload";
        else if (embedUrl.includes("dood.sh") || embedUrl.includes("doodstream")) embedType = "dood";
        else embedType = "other";
      }

      embeds.push({ slug: entry.slug, embedUrl, embedType });
      added++;
      const shortUrl = embedUrl ? embedUrl.slice(0, 80) : "N/A";
      console.log(`  [${postId}] -> ${embedType || "?"}: ${shortUrl}`);

    } catch (err: any) {
      console.warn(`  Error: ${err?.message || err}`);
      embeds.push({ slug: entry.slug, embedUrl: null, embedType: null });
    }

    if (added % 10 === 0 && added > 0) {
      saveProgress(p, embeds);
      console.log(`  [auto-saved ${added} new embeds]`);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  saveProgress(p, embeds);
  console.log(`\nDone. Added ${added} embeds. Total: ${embeds.length}`);
  return embeds;
}

if (process.argv[1]?.includes("vivamax-embeds")) {
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) || 50 : -1;
  scrapeEmbeds(limit).then(() => process.exit(0));
}
