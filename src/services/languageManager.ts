import { tmdbApi, type MediaType } from "../api/tmdb";

export interface AvailableLanguage {
  code: string;
  name: string;
  type: "original";
}

export const LanguageManager = {
  getAvailableLanguages: async (type: MediaType, id: number): Promise<AvailableLanguage[]> => {
    try {
      const details = await tmdbApi.details(type, id);
      const languages: AvailableLanguage[] = [];

      if (details.original_language) {
        const originalName = details.spoken_languages?.find(
          (l: any) => l.iso_639_1 === details.original_language
        )?.english_name || details.original_language.toUpperCase();

        languages.push({
          code: details.original_language,
          name: `${originalName} (Original)`,
          type: "original",
        });
      }

      return languages;
    } catch {
      return [];
    }
  },
};
