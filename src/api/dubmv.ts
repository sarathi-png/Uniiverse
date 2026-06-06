import axios from "axios";

export interface DubmvEntry {
  fileId: number;
  title: string;
  year: number;
  tmdbId: number | null;
  type: "movie" | "tv";
  posterUrl: string | null;
  directUrl: string;
  downloadUrl: string | null;
  fileSize: string | null;
  duration: string | null;
  format: string | null;
  quality: string;
  addedAt: string;
}

export interface DubmvListResponse {
  page: number;
  totalPages: number;
  total: number;
  items: DubmvEntry[];
}

export interface DubmvPopularItem {
  title: string;
  year: number;
  tmdbId: number;
  type: "movie" | "tv";
  popularity: number;
  directUrl: string | null;
  fileId: number | null;
  quality: string | null;
  cached: boolean;
  posterUrl: string | null;
  posterPath: string | null;
}

const client = axios.create({
  baseURL: "/api/dubmv",
  timeout: 15000,
});

export const dubmvApi = {
  streamUrl: (fileId: number): string => `/api/dubmv/proxy/${fileId}`,

  list: async (params?: {
    page?: number;
    limit?: number;
    type?: "movie" | "tv";
    search?: string;
    matched?: boolean;
  }): Promise<DubmvListResponse> => {
    const { data } = await client.get<DubmvListResponse>("/list", { params });
    return data;
  },

  lookup: async (fileId: number): Promise<DubmvEntry> => {
    const { data } = await client.get<DubmvEntry>(`/lookup/${fileId}`);
    return data;
  },

  scrape: async (fileId: number): Promise<DubmvEntry> => {
    const { data } = await client.post<DubmvEntry>(`/scrape/${fileId}`);
    return data;
  },

  count: async (): Promise<{ total: number; matched: number; movies: number; tv: number }> => {
    const { data } = await client.get("/count");
    return data;
  },

  popular: async (): Promise<{ total: number; items: DubmvPopularItem[] }> => {
    const { data } = await client.get("/popular");
    return data;
  },
};
