interface Provider {
  id: string;
  name: string;
  buildUrl: (tmdbId: number, type: "movie" | "tv", season?: number, episode?: number) => string;
}

const PROVIDERS: Provider[] = [
  {
    id: "vidsrc",
    name: "VidSrc",
    buildUrl: (tmdbId: number, type: "movie" | "tv", season?: number, episode?: number): string => {
      if (type === "tv") return `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`;
      return `https://vidsrc.fyi/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "vidsrcto",
    name: "VidSrc (Alt)",
    buildUrl: (tmdbId: number, type: "movie" | "tv", season?: number, episode?: number): string => {
      if (type === "tv") return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
      return `https://vidsrc.to/embed/movie/${tmdbId}`;
    },
  },
  {
    id: "2embed",
    name: "2Embed",
    buildUrl: (tmdbId: number, type: "movie" | "tv", season?: number, episode?: number): string => {
      if (type === "tv") return `https://2embed.cc/embed/${tmdbId}?s=${season}&e=${episode}`;
      return `https://2embed.cc/embed/${tmdbId}`;
    },
  },
];

export interface ScraperSource {
  url: string;
  directUrl: null;
  name: string;
  provider: string;
  quality: string;
  languages: string[];
  isEmbed: boolean;
  playUrl: null;
  providerId: string;
}

export interface ScraperResult {
  sources: ScraperSource[];
  providerCount: number;
}

async function scrapeDirectSource(
  provider: Provider,
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): Promise<ScraperSource | null> {
  try {
    const url = provider.buildUrl(tmdbId, type, season, episode);

    return {
      url,
      directUrl: null,
      name: provider.name,
      provider: "Web Mirror",
      quality: "Auto",
      languages: ["en"],
      isEmbed: true,
      playUrl: null,
      providerId: provider.id,
    };
  } catch {
    return null;
  }
}

export async function scrapeAll(
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): Promise<ScraperResult> {
  const results = await Promise.allSettled(
    PROVIDERS.map((provider) =>
      scrapeDirectSource(provider, tmdbId, type, season, episode)
    )
  );

  const sources: ScraperSource[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      sources.push(result.value);
    }
  }

  return {
    sources,
    providerCount: sources.length,
  };
}

export async function scrapeBest(
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): Promise<ScraperSource | null> {
  for (const provider of PROVIDERS) {
    const source = await scrapeDirectSource(provider, tmdbId, type, season, episode);
    if (source) return source;
  }
  return null;
}
