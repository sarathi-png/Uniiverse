import axios from "axios";
import * as cheerio from "cheerio";

const http = axios.create({ timeout: 10000, validateStatus: () => true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://tracker.dler.org:6969/announce",
  "https://tracker.moeblog.cn:443/announce",
  "https://tracker.zhuqiy.com:443/announce",
  "udp://open.dstud.io:6969/announce",
];

export interface ScrapedTorrent {
  magnet: string;
  name: string;
  quality: string;
  size: string;
  seeds: number;
  peers: number;
  source: string;
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

function parseQuality(name: string): string {
  const m = name.match(/\b(2160p|1080p|720p|480p|360p|4[Kk])\b/);
  if (!m) return "HD";
  if (m[1].toLowerCase() === "4k") return "4K";
  return m[1];
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

function parseSize(str: string): string {
  const m = str.trim().match(/^([\d.]+)\s*(GB|MB|KB|TB)/i);
  if (!m) return "Unknown";
  return `${m[1]} ${m[2].toUpperCase()}`;
}

// ─── LimeTorrents ────────────────────────────────────────────────

export async function scrapeLimeTorrents(query: string): Promise<ScrapedTorrent[]> {
  try {
    const url = `https://www.limetorrents.fun/search/all/${encodeURIComponent(query)}/`;
    const res = await http.get(url, { headers: { "User-Agent": UA } });
    const html = res.data as string;
    const $ = cheerio.load(html);

    const results: ScrapedTorrent[] = [];

    $("table.table2 tr").each((_i, row) => {
      const tds = $(row).find("td");
      if (tds.length < 6) return;

      const nameEl = $(tds[0]).find("div.tt-name a").last();
      const name = nameEl.text().trim();
      if (!name) return;

      const torrentLink = $(tds[0]).find("a.csprite_dl14").attr("href") || "";
      const infoHash = extractHashFromTorrentUrl(torrentLink);
      if (!infoHash) return;

      const sizeText = $(tds[2]).text().trim();
      const seeds = parseInt($(tds[3]).text().trim()) || 0;
      const peers = parseInt($(tds[4]).text().trim()) || 0;

      if (seeds === 0) return;

      results.push({
        magnet: buildMagnet(infoHash, name),
        name,
        quality: parseQuality(name),
        size: parseSize(sizeText),
        seeds,
        peers,
        source: "LimeTorrents",
      });
    });

    return results.sort((a, b) => b.seeds - a.seeds);
  } catch {
    return [];
  }
}

function extractHashFromTorrentUrl(url: string): string | null {
  const m = url.match(/\/([A-Fa-f0-9]{40})\.torrent/);
  return m ? m[1].toLowerCase() : null;
}

// ─── 1337x ────────────────────────────────────────────────────────

export async function scrape1337x(query: string): Promise<ScrapedTorrent[]> {
  try {
    const url = `https://1337x.to/search/${encodeURIComponent(query)}/1/`;
    const res = await http.get(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.google.com/",
      },
    });
    const html = res.data as string;
    const $ = cheerio.load(html);

    const results: ScrapedTorrent[] = [];

    $("table.table-list tbody tr").each((_i, row) => {
      const nameEl = $(row).find("td.name a").last();
      const name = nameEl.text().trim();
      if (!name) return;

      const detailLink = nameEl.attr("href") || "";
      const fullDetailUrl = detailLink.startsWith("http") ? detailLink : `https://1337x.to${detailLink}`;

      const seeds = parseInt($(row).find("td.seeds").text().trim()) || 0;
      const peers = parseInt($(row).find("td.leeches").text().trim()) || 0;
      const sizeText = $(row).find("td.size").text().trim().replace(/[^\d.]+(GB|MB|KB)/i, " $1");

      if (seeds === 0) return;

      results.push({
        magnet: "",
        name,
        quality: parseQuality(name),
        size: sizeText || "Unknown",
        seeds,
        peers,
        source: "1337x",
      });

      // Store detail URL for magnet fetch
      if (fullDetailUrl) {
        pendingMagnetUrls.set(fullDetailUrl, results.length - 1);
      }
    });

    return results;
  } catch {
    return [];
  }
}

// 1337x stores detail page URLs for magnet-fetching later
const pendingMagnetUrls = new Map<string, number>();

export async function resolve1337xMagnets(results: ScrapedTorrent[]): Promise<ScrapedTorrent[]> {
  const updated = [...results];
  const batch = Array.from(pendingMagnetUrls.entries()).slice(0, 5);

  for (const [detailUrl, idx] of batch) {
    try {
      const res = await http.get(detailUrl, {
        headers: { "User-Agent": UA, "Accept": "text/html", "Referer": "https://1337x.to/" },
      });
      const $ = cheerio.load(res.data as string);
      const magnetLink = $('a[href^="magnet:"]').attr("href");
      if (magnetLink) {
        updated[idx] = { ...updated[idx], magnet: magnetLink };
      }
    } catch {
      // skip
    }
  }

  pendingMagnetUrls.clear();
  return updated.filter((t) => t.magnet);
}

// ─── TPB (title-based search) ────────────────────────────────────

export async function scrapeTPB(query: string): Promise<ScrapedTorrent[]> {
  try {
    const url = `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=201`;
    const res = await http.get(url);
    const data = res.data as any[];
    if (!Array.isArray(data)) return [];

    const seen = new Set<string>();
    return data
      .filter((t: any) => t.info_hash && t.name && !seen.has(t.info_hash) && seen.add(t.info_hash))
      .map((t: any) => ({
        magnet: buildMagnet(t.info_hash, t.name),
        name: t.name,
        quality: parseQuality(t.name),
        size: formatSize(Number(t.size) || 0),
        seeds: Number(t.seeders) || 0,
        peers: Number(t.leechers) || 0,
        source: "TPB",
      }))
      .filter((t) => t.seeds > 0)
      .sort((a, b) => b.seeds - a.seeds);
  } catch {
    return [];
  }
}

// ─── Aggregation ─────────────────────────────────────────────────

export async function searchAllTorrents(query: string, year?: string): Promise<ScrapedTorrent[]> {
  const yearFiltered = year ? `${query} ${year}` : query;

  const [lime, tpb, leet] = await Promise.allSettled([
    scrapeLimeTorrents(yearFiltered),
    scrapeTPB(query),
    scrape1337x(yearFiltered),
  ]);

  const all: ScrapedTorrent[] = [];

  if (lime.status === "fulfilled") all.push(...lime.value);
  if (tpb.status === "fulfilled") all.push(...tpb.value);

  if (leet.status === "fulfilled" && leet.value.length > 0) {
    const resolved = await resolve1337xMagnets(leet.value);
    all.push(...resolved);
  } else {
    all.push(...(leet.status === "fulfilled" ? leet.value.filter((t) => t.magnet) : []));
  }

  const seen = new Set<string>();
  return all
    .filter((t) => {
      const hash = extractHash(t.magnet);
      if (!hash || seen.has(hash)) return false;
      seen.add(hash);
      return true;
    })
    .sort((a, b) => {
      const aHasYear = year ? (a.name.includes(year) ? 1 : 0) : 1;
      const bHasYear = year ? (b.name.includes(year) ? 1 : 0) : 1;
      if (aHasYear !== bHasYear) return bHasYear - aHasYear;
      return b.seeds - a.seeds;
    });
}

function extractHash(magnet: string): string | null {
  if (!magnet) return null;
  const m = magnet.match(/btih:([a-fA-F0-9]+)/);
  return m ? m[1].toLowerCase() : null;
}
