import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const CACHE_FILE = path.join(DATA_DIR, "languages.json");

const DAHMER_API = "https://a.111477.xyz";
const DAHMER_WORKER = "https://p.111477.xyz/bulk?u=";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  Referer: DAHMER_API + "/",
};

const LANGUAGE_PATTERNS: [RegExp, string][] = [
  [/Tamil|ta|தமிழ்/i, "ta"],
  [/Hindi|hi|हिन्दी|HinDub/i, "hi"],
  [/Telugu|te|తెలుగు/i, "te"],
  [/Malayalam|ml|മലയാളം/i, "ml"],
  [/Kannada|kn|ಕನ್ನಡ/i, "kn"],
  [/Korean|ko|한국어/i, "ko"],
  [/Japanese|ja|日本語/i, "ja"],
  [/Mandarin|Chinese|zh|中文/i, "zh"],
  [/Spanish|es|Español/i, "es"],
  [/French|fr|Français/i, "fr"],
  [/German|de|Deutsch/i, "de"],
];

const MULTI_PATTERN = /Multi\.?Audio|Dual\.?Audio|Multi-Lang|MULTi/i;

export interface SubtitleFile {
  url: string;
  label: string;
  lang: string;
}

export interface LanguageFile {
  url: string;
  directUrl: string;
  name: string;
  subtitles?: SubtitleFile[];
}

export interface TVEpisodeResult {
  season: number;
  episode: number;
  files: LanguageFile[];
  languages: string[];
}

export interface TVScanResult {
  tmdbId: string;
  title: string;
  year: string;
  originalLanguage: string;
  episodes: TVEpisodeResult[];
  lastScanned: number;
}

export interface LanguageScanResult {
  languages: string[];
  originalLanguage: string;
  lastScanned: number;
  files: LanguageFile[];
}

type CacheData = Record<string, LanguageScanResult>;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readCache(): CacheData {
  ensureDataDir();
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch {
    // ignore corrupt cache
  }
  return {};
}

function writeCache(data: CacheData): void {
  ensureDataDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function detectLanguages(filename: string): Set<string> {
  const detected = new Set<string>();
  for (const [pattern, code] of LANGUAGE_PATTERNS) {
    if (pattern.test(filename)) {
      detected.add(code);
    }
  }
  if (MULTI_PATTERN.test(filename)) {
    detected.add("ta");
    detected.add("hi");
    detected.add("te");
    detected.add("ml");
    detected.add("kn");
  }
  return detected;
}

async function fetchPage(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

interface ParsedFile {
  name: string;
  href: string;
}

function parseFileLinks(html: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    const aMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i);
    if (aMatch) {
      const href = aMatch[1];
      const name = aMatch[2].trim();
      if (name && /\.(mkv|mp4|avi|webm|m3u8)$/i.test(name)) {
        files.push({ name, href });
      }
    }
  }
  return files;
}

interface TMDBLookupResult {
  title: string;
  year: string;
  originalLanguage: string;
}

async function lookupTMDB(
  tmdbId: string | number,
  type: "movie" | "tv"
): Promise<TMDBLookupResult | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(
      `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!r.ok) return null;
    const data = await r.json();
    const title = data.title || data.name || "";
    const date = data.release_date || data.first_air_date || "";
    return {
      title,
      year: date.substring(0, 4),
      originalLanguage: data.original_language || "en",
    };
  } catch {
    return null;
  }
}

function proxyUrl(fileUrl: string): string {
  return DAHMER_WORKER + encodeURIComponent(fileUrl);
}

function resolveUrl(base: string, href: string): string {
  if (href.startsWith("http")) return href;
  const baseClean = base.endsWith("/") ? base : base.substring(0, base.lastIndexOf("/") + 1);
  return baseClean + href;
}

let writeMutex: Promise<void> | null = null;

function writeCacheLocked(data: CacheData): Promise<void> {
  const prev = writeMutex;
  const next = (async () => {
    if (prev) await prev;
    writeCache(data);
  })();
  writeMutex = next;
  return next;
}

function detectSubtitles(html: string, baseUrl: string): SubtitleFile[] {
  const subs: SubtitleFile[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    const aMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i);
    if (aMatch) {
      const href = aMatch[1];
      const name = aMatch[2].trim();
      if (/\.(vtt|srt|ass|ssa)$/i.test(name)) {
        const detected = new Set<string>();
        for (const [pattern, code] of LANGUAGE_PATTERNS) {
          if (pattern.test(name)) detected.add(code);
        }
        const lang = detected.size > 0 ? detected.values().next().value ?? "en" : "en";
        const absUrl = resolveUrl(baseUrl, href);
        subs.push({ url: proxyUrl(absUrl), label: name.replace(/\.(vtt|srt|ass|ssa)$/i, ""), lang });
      }
    }
  }
  return subs;
}

async function scanTVShow(
  tmdbId: string | number,
  season?: number,
  episode?: number
): Promise<TVScanResult | null> {
  const tmdbData = await lookupTMDB(tmdbId, "tv");
  if (!tmdbData || !tmdbData.title) return null;

  const cleanTitle = tmdbData.title.replace(/:/g, "");
  const dirsToTry = [
    `${DAHMER_API}/tvs/${encodeURIComponent(cleanTitle + " (" + tmdbData.year + ")")}/`,
    `${DAHMER_API}/kdrama/${encodeURIComponent(cleanTitle + " (" + tmdbData.year + ")")}/`,
    `${DAHMER_API}/asiandrama/${encodeURIComponent(cleanTitle + " (" + tmdbData.year + ")")}/`,
    `${DAHMER_API}/tvs/${encodeURIComponent(cleanTitle)}/`,
    `${DAHMER_API}/kdrama/${encodeURIComponent(cleanTitle)}/`,
    `${DAHMER_API}/asiandrama/${encodeURIComponent(cleanTitle)}/`,
  ];

  let rootHtml: string | null = null;
  let rootUrl = "";
  for (const url of dirsToTry) {
    const html = await fetchPage(url);
    if (html) { rootHtml = html; rootUrl = url; break; }
  }
  if (!rootHtml) return null;

  const seasonDirs: { name: string; href: string }[] = [];
  const dirLinkRegex = /<a[^>]*href="([^"]*)"[^>]*>\s*([^<]+)\s*<\/a>/gi;
  let dirMatch: RegExpExecArray | null;
  while ((dirMatch = dirLinkRegex.exec(rootHtml)) !== null) {
    const href = dirMatch[1];
    const name = dirMatch[2].trim();
    if (/season\s*\d+|s\d+/i.test(name) && href.endsWith("/")) {
      seasonDirs.push({ name, href });
    }
  }
  if (seasonDirs.length === 0) {
    seasonDirs.push({ name: "Season 1", href: "./" });
  }

  const episodes: TVEpisodeResult[] = [];

  for (const sDir of seasonDirs) {
    const sNum = parseInt(sDir.name.match(/\d+/)?.[0] || "1");
    if (season != null && sNum !== season) continue;

    const seasonUrl = resolveUrl(rootUrl, sDir.href);
    const seasonHtml = await fetchPage(seasonUrl);
    if (!seasonHtml) continue;

    const episodeFiles: { name: string; href: string }[] = [];
    const fileLinkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    let fMatch: RegExpExecArray | null;
    while ((fMatch = fileLinkRegex.exec(seasonHtml)) !== null) {
      const href = fMatch[1];
      const name = fMatch[2].trim();
      if (/\.(mkv|mp4|avi|webm|m3u8)$/i.test(name)) {
        episodeFiles.push({ name, href });
      }
    }

    const subs = detectSubtitles(seasonHtml, seasonUrl);

    const epMap = new Map<number, LanguageFile[]>();
    for (const f of episodeFiles) {
      const epNumMatch = f.name.match(/[eE]pisode\s*(\d+)|[eE](\d+)|(\d+)\s*[eE]p/i);
      let epNum = episode || 1;
      if (epNumMatch) {
        epNum = parseInt(epNumMatch[1] || epNumMatch[2] || epNumMatch[3] || "1");
      }
      const absUrl = resolveUrl(seasonUrl, f.href);
      if (!epMap.has(epNum)) epMap.set(epNum, []);
      epMap.get(epNum)!.push({
        url: proxyUrl(absUrl),
        directUrl: absUrl,
        name: f.name,
        subtitles: subs,
      });
    }

    for (const [epNum, files] of epMap) {
      if (episode != null && epNum !== episode) continue;
      const allLangs = new Set<string>();
      allLangs.add("en");
      for (const f of files) {
        for (const lang of detectLanguages(f.name)) allLangs.add(lang);
      }
      episodes.push({
        season: sNum,
        episode: epNum,
        files,
        languages: Array.from(allLangs).sort(),
      });
    }
  }

  return {
    tmdbId: String(tmdbId),
    title: tmdbData.title,
    year: tmdbData.year,
    originalLanguage: tmdbData.originalLanguage,
    episodes,
    lastScanned: Date.now(),
  };
}

function buildMovieDirUrls(title: string, year: string): string[] {
  const clean = title.replace(/:/g, "");
  const suffixes = ["", " [IMDB]", " [BluRay]", " [WEB-DL]", " [UHDRemux]"];
  const urls: string[] = [];
  for (const s of suffixes) {
    urls.push(`${DAHMER_API}/movies/${encodeURIComponent(clean + " (" + year + ")" + s)}/`);
  }
  urls.push(`${DAHMER_API}/movies/${encodeURIComponent(clean)}/`);
  return urls;
}

export async function scanMovie(
  tmdbId: string | number,
  type: "movie" | "tv" = "movie",
  knownTitle?: string,
  knownYear?: string
): Promise<LanguageScanResult> {
  const cache = readCache();
  const key = String(tmdbId);

  const cached = cache[key];
  if (cached && Date.now() - cached.lastScanned < CACHE_TTL_MS) {
    return cached;
  }

  let tmdbData: TMDBLookupResult | null = null;

  if (knownTitle && knownYear) {
    tmdbData = {
      title: knownTitle,
      year: knownYear,
      originalLanguage: "en",
    };
  } else {
    tmdbData = await lookupTMDB(tmdbId, type);
  }

  if (!tmdbData || !tmdbData.title) {
    const fallback: LanguageScanResult = {
      languages: ["en"],
      originalLanguage: "en",
      lastScanned: Date.now(),
      files: [],
    };
    const c = readCache();
    c[key] = fallback;
    writeCacheLocked(c);
    return fallback;
  }

  const allLanguages = new Set<string>();
  allLanguages.add("en");
  const allFiles: LanguageFile[] = [];

  const dirUrls = buildMovieDirUrls(tmdbData.title, tmdbData.year);
  for (const dirUrl of dirUrls) {
    const html = await fetchPage(dirUrl);
    if (!html) continue;
    const files = parseFileLinks(html);
    for (const file of files) {
      const absUrl = resolveUrl(dirUrl, file.href);
      allFiles.push({ url: proxyUrl(absUrl), directUrl: absUrl, name: file.name });
      const fileLangs = detectLanguages(file.name);
      for (const lang of fileLangs) {
        allLanguages.add(lang);
      }
    }
    if (files.length > 0) break;
  }

  const result: LanguageScanResult = {
    languages: Array.from(allLanguages).sort(),
    originalLanguage: tmdbData.originalLanguage,
    lastScanned: Date.now(),
    files: allFiles,
  };

  const c = readCache();
  c[key] = result;
  writeCacheLocked(c);

  return result;
}

export async function scanMedia(
  tmdbId: string | number,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): Promise<{
  type: "movie" | "tv";
  sources: LanguageFile[];
  subtitles: SubtitleFile[];
  languages: string[];
} | null> {
  if (type === "movie") {
    const result = await scanMovie(tmdbId, "movie");
    if (!result) return null;
    return {
      type: "movie",
      sources: result.files,
      subtitles: [],
      languages: result.languages,
    };
  }

  const tvResult = await scanTVShow(tmdbId, season, episode);
  if (!tvResult) return null;

  const target = tvResult.episodes.find(
    (e) => (season == null || e.season === season) && (episode == null || e.episode === episode)
  );
  if (!target) {
    return {
      type: "tv",
      sources: [],
      subtitles: [],
      languages: tvResult.episodes.length > 0 ? tvResult.episodes[0].languages : ["en"],
    };
  }

  const allSubtitles: SubtitleFile[] = [];
  for (const f of target.files) {
    if (f.subtitles) allSubtitles.push(...f.subtitles);
  }

  return {
    type: "tv",
    sources: target.files,
    subtitles: allSubtitles,
    languages: target.languages,
  };
}

export function getCachedLanguages(
  tmdbId: string | number
): LanguageScanResult | null {
  const cache = readCache();
  const key = String(tmdbId);
  const cached = cache[key];
  if (cached && Date.now() - cached.lastScanned < CACHE_TTL_MS) {
    return cached;
  }
  return null;
}

export function getBatchLanguages(
  ids: (string | number)[]
): Record<string, LanguageScanResult | null> {
  const cache = readCache();
  const result: Record<string, LanguageScanResult | null> = {};
  for (const id of ids) {
    const key = String(id);
    const cached = cache[key];
    if (cached && Date.now() - cached.lastScanned < CACHE_TTL_MS) {
      result[key] = cached;
    } else {
      result[key] = null;
    }
  }
  return result;
}

function parseResolution(name: string): number {
  const m = name.match(/\b(2160p|1080p|720p|480p|360p|4[Kk])\b/);
  if (!m) return 9999;
  if (m[1].toLowerCase() === "4k") return 2160;
  return parseInt(m[1]);
}

export function getBestFileForLanguage(
  tmdbId: string | number,
  lang: string
): LanguageFile | null {
  const cached = getCachedLanguages(tmdbId);
  if (!cached || !cached.files || cached.files.length === 0) return null;

  const langFiles = cached.files.filter((f) =>
    new RegExp(lang, "i").test(f.name)
  );

  if (langFiles.length > 0) {
    langFiles.sort((a, b) => parseResolution(a.name) - parseResolution(b.name));
    return langFiles[0];
  }

  const multiFiles = cached.files.filter((f) => MULTI_PATTERN.test(f.name));
  if (multiFiles.length > 0) {
    multiFiles.sort((a, b) => parseResolution(a.name) - parseResolution(b.name));
    return multiFiles[0];
  }

  const sorted = [...cached.files].sort((a, b) => parseResolution(a.name) - parseResolution(b.name));
  return sorted[0];
}
