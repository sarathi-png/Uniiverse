import NodeCache from "node-cache";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const BASE_URL = "https://api.themoviedb.org/3";

const cache = new NodeCache({ stdTTL: 300, maxKeys: 500 });

export async function fetchTMDB<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const query = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  const url = `${BASE_URL}${endpoint}?${query.toString()}`;

  const cached = cache.get<T>(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`TMDB API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as T;
  cache.set(url, data);
  return data;
}
