import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

function pathSlug(fullUrl: string): string {
  return fullUrl.split("/").pop() || fullUrl;
}

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

export interface VivamaxEmbed {
  slug: string;
  embedUrl: string | null;
  embedType: string | null;
}

export interface VivamaxItem extends VivamaxEntry {
  pathSlug: string;
  embedUrl: string | null;
  embedType: string | null;
}

function loadCatalog(): VivamaxEntry[] {
  const p = resolve(DATA_DIR, "vivamax-catalog.json");
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf-8")) as VivamaxEntry[];
}

function loadEmbeds(): VivamaxEmbed[] {
  const p = resolve(DATA_DIR, "vivamax-embeds.json");
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf-8")) as VivamaxEmbed[];
}

export function getAllVivamaxItems(): VivamaxItem[] {
  const catalog = loadCatalog();
  const embeds = loadEmbeds();
  const embedMap = new Map(embeds.map((e) => [e.slug, e]));
  return catalog.map((entry) => {
    const embed = embedMap.get(entry.slug);
    return {
      ...entry,
      pathSlug: pathSlug(entry.slug),
      embedUrl: embed?.embedUrl || null,
      embedType: embed?.embedType || null,
    };
  });
}

export function getVivamaxBySlug(slug: string): VivamaxItem | null {
  return getAllVivamaxItems().find(
    (item) => item.slug === slug || pathSlug(item.slug) === slug
  ) || null;
}

export function getVivamaxCount(): { total: number; withEmbeds: number } {
  const all = getAllVivamaxItems();
  return {
    total: all.length,
    withEmbeds: all.filter((i) => i.embedUrl).length,
  };
}
