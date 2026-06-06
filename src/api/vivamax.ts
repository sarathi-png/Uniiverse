import axios from "axios";

export interface VivamaxItem {
  slug: string;
  pathSlug: string;
  title: string;
  year: number | null;
  tmdbId: number | null;
  posterUrl: string | null;
  rating: number | null;
  quality: string;
  overview: string | null;
  adult: boolean;
  embedUrl: string | null;
  embedType: string | null;
}

export interface VivamaxListResponse {
  page: number;
  totalPages: number;
  total: number;
  items: VivamaxItem[];
}

export interface VivamaxEmbedResponse {
  slug: string;
  postId: string;
  embedUrl: string;
}

const client = axios.create({
  baseURL: "/api/vivamax",
  timeout: 15000,
});

export const vivamaxApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<VivamaxListResponse> => {
    const { data } = await client.get<VivamaxListResponse>("/list", { params });
    return data;
  },

  lookup: async (slug: string): Promise<VivamaxItem> => {
    const { data } = await client.get<VivamaxItem>(`/lookup/${slug}`);
    return data;
  },

  count: async (): Promise<{ total: number; withEmbeds: number }> => {
    const { data } = await client.get("/count");
    return data;
  },

  proxyEmbed: async (slug: string): Promise<VivamaxEmbedResponse> => {
    const { data } = await client.get<VivamaxEmbedResponse>(`/proxy-embed/${slug}`);
    return data;
  },
};
