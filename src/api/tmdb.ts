import axios from "axios";

export const IMG = {
  poster: (p?: string | null, size = "w500") =>
    p ? `https://image.tmdb.org/t/p/${size}${p}` : "",
  backdrop: (p?: string | null, size = "original") =>
    p ? `https://image.tmdb.org/t/p/${size}${p}` : "",
  profile: (p?: string | null, size = "w300") =>
    p ? `https://image.tmdb.org/t/p/${size}${p}` : "",
};

const tmdb = axios.create({
  baseURL: "/api/tmdb",
  timeout: 12000,
});

// simple retry interceptor
tmdb.interceptors.response.use(undefined, async (err) => {
  const cfg = err.config || {};
  cfg.__retry = (cfg.__retry || 0) + 1;
  if (cfg.__retry <= 2 && (!err.response || err.response.status >= 500)) {
    await new Promise((r) => setTimeout(r, 400 * cfg.__retry));
    return tmdb(cfg);
  }
  return Promise.reject(err);
});

export type MediaType = "movie" | "tv";

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: MediaType;
  genre_ids?: number[];
}

const get = async <T,>(url: string, params?: Record<string, any>): Promise<T> => {
  const { data } = await tmdb.get<T>(url, { params });
  return data;
};

export const rawGet = get;

export const tmdbApi = {
  trending: (window: "day" | "week" = "week", type: "all" | MediaType = "all") =>
    get<{ results: MediaItem[] }>(`/trending/${type}/${window}`).then(
      (d) => d.results
    ),
  popular: (type: MediaType) =>
    get<{ results: MediaItem[] }>(`/${type}/popular`).then((d) => d.results),
  topRated: (type: MediaType) =>
    get<{ results: MediaItem[] }>(`/${type}/top_rated`).then((d) => d.results),
  upcoming: () =>
    get<{ results: MediaItem[] }>(`/movie/upcoming`).then((d) => d.results),
  airingToday: () =>
    get<{ results: MediaItem[] }>(`/tv/airing_today`).then((d) => d.results),
  byGenre: (type: MediaType, genreId: number, page = 1) =>
    get<{ results: MediaItem[]; total_pages: number }>(`/discover/${type}`, {
      with_genres: genreId,
      page,
      sort_by: "popularity.desc",
    }),
  discover: (type: MediaType, params: Record<string, any>) =>
    get<{ results: MediaItem[]; total_pages: number }>(`/discover/${type}`, params),
  details: (type: MediaType, id: number) =>
    get<any>(`/${type}/${id}`, {
      append_to_response: "videos,credits,similar,recommendations,reviews,images,release_dates,content_ratings",
      include_image_language: "en,null",
    }),
  season: (id: number, season: number) =>
    get<any>(`/tv/${id}/season/${season}`),
  search: (query: string, page = 1) =>
    get<{ results: MediaItem[]; total_pages: number }>(`/search/multi`, {
      query,
      page,
      include_adult: false,
    }),
  genres: (type: MediaType) =>
    get<{ genres: { id: number; name: string }[] }>(`/genre/${type}/list`).then(
      (d) => d.genres
    ),

};

export const title = (m: MediaItem | any) => m?.title || m?.name || "Untitled";
export const year = (m: MediaItem | any) => {
  const d = m?.release_date || m?.first_air_date;
  return d ? new Date(d).getFullYear() : "";
};
export const mediaTypeOf = (m: MediaItem | any): MediaType =>
  m?.media_type === "tv" || m?.name ? "tv" : m?.media_type === "movie" ? "movie" : m?.title ? "movie" : "movie";
