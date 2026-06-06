import axios from "axios";

export interface ApiSubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

export interface MediaStreamSource {
  url: string;
  directUrl: string | null;
  name: string;
  provider: string;
  quality: string;
  languages: string[];
  isEmbed: boolean;
  playUrl: string | null;
}

export interface MediaStreamResponse {
  tmdbId: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;

  sources: MediaStreamSource[];
  subtitles: ApiSubtitleTrack[];
}

const client = axios.create({
  baseURL: "/api/language",
  timeout: 30000,
});

export const mediaStreamApi = {
  getStream: async (
    id: number,
    type: "movie" | "tv",
    season?: number,
    episode?: number,
    lang?: string
  ): Promise<MediaStreamResponse> => {
    const params: Record<string, string | number> = { type };
    if (season != null) params.season = season;
    if (episode != null) params.episode = episode;
    if (lang) params.lang = lang;
    const { data } = await client.get<MediaStreamResponse>(`/media/${id}`, { params });
    return data;
  },
};
