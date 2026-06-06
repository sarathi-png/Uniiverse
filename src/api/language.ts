import axios from "axios";

const api = axios.create({
  baseURL: "/api/language",
  timeout: 30000,
});

export interface LanguageResult {
  tmdbId: string;
  languages: string[];
  originalLanguage: string;
  lastScanned: number;
}

export type BatchResponse = Record<string, LanguageResult | null>;

export const languageApi = {
  scan: (id: string | number, type: "movie" | "tv" = "movie", title?: string, year?: string) =>
    api.get<LanguageResult>(`/scan/${id}`, { params: { type, title, year } }).then((r) => r.data),

  get: (id: string | number) =>
    api.get<LanguageResult>(`/${id}`).then((r) => r.data),

  batch: (ids: (string | number)[]) =>
    api.post<BatchResponse>("/batch", { ids }).then((r) => r.data),
};
