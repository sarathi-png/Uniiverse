import type { MediaType } from "../api/tmdb";

const RATING_COLORS: Record<string, string> = {
  G: "bg-green-500/20 text-green-400 border-green-500/30",
  PG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "PG-13": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  R: "bg-red-500/20 text-red-400 border-red-500/30",
  "NC-17": "bg-red-600/20 text-red-500 border-red-600/30",
  "TV-Y": "bg-green-500/20 text-green-400 border-green-500/30",
  "TV-Y7": "bg-green-600/20 text-green-400 border-green-600/30",
  "TV-G": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "TV-PG": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "TV-14": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "TV-MA": "bg-red-500/20 text-red-400 border-red-500/30",
};

export function getCertification(data: any, mediaType: MediaType): string | null {
  if (mediaType === "movie") {
    const us = data?.release_dates?.results?.find((r: any) => r.iso_3166_1 === "US");
    if (us?.release_dates?.length) {
      const cert = us.release_dates.find((d: any) => d.certification && d.certification.trim());
      if (cert?.certification) return cert.certification;
    }
  } else {
    const us = data?.content_ratings?.results?.find((r: any) => r.iso_3166_1 === "US");
    if (us?.rating) return us.rating;
  }
  return null;
}

interface Props {
  data: any;
  mediaType: MediaType;
}

export default function ContentRatingBadge({ data, mediaType }: Props) {
  const certification = getCertification(data, mediaType);
  if (!certification) return null;

  const colorClass = RATING_COLORS[certification] || "bg-white/10 text-white/60 border-white/20";

  return (
    <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${colorClass}`}>
      {certification}
    </span>
  );
}
