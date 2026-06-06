import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { tmdbApi, type MediaType, type MediaItem } from "../api/tmdb";
import { useGenres } from "../hooks/queries";
import MediaCard from "../components/MediaCard";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
  { code: "ko", name: "Korean" },
  { code: "ja", name: "Japanese" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "zh", name: "Mandarin" },
];



const AGE_GROUPS = [
  { label: "0-10 Years (Kids)", value: "kids" },
  { label: "11-15 Years (Teens)", value: "teens" },
  { label: "18+ (A, R, Adults)", value: "adults" },
];



export default function Browse() {
  const { type } = useParams<{ type: MediaType }>();
  const mt = (type as MediaType) || "movie";
  const { data: genres } = useGenres(mt);
  const [genre, setGenre] = useState<number | null>(null);
  const [language, setLanguage] = useState<string>("");
  const [age, setAge] = useState<string>("");

  const [items, setItems] = useState<MediaItem[]>([]);
  const filteredItems = items;
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = {
          sort_by: "popularity.desc",
        };
      
        if (genre) params.with_genres = genre;
        if (language) params.with_original_language = language;
      
        if (age) {
          params.certification_country = "US";
          if (mt === "movie") {
            if (age === "kids") params.certification = "G|PG";
            if (age === "teens") params.certification = "PG-13";
            if (age === "adults") params.certification = "R|NC-17";
          } else {
            if (age === "kids") params.certification = "TV-Y|TV-Y7|TV-G|TV-PG";
            if (age === "teens") params.certification = "TV-14";
            if (age === "adults") params.certification = "TV-MA";
          }
        }

        params.page = p;
        const res = await tmdbApi.discover(mt, params);
        setItems((prev) => (reset ? res.results : [...prev, ...res.results]));
        setHasMore(p < res.total_pages);
      } catch (e: any) {
        console.error("Browse load failed:", e);
        setError(e?.response?.data?.error || e?.message || "Failed to load");
        if (reset) setItems([]);
      }
      setLoading(false);
    },
    [mt, genre, language, age]
  );

  useEffect(() => {
    setPage(1);
    load(1, true);
  }, [load]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          load(next);
        }
      },
      { rootMargin: "400px" }
    );
    if (sentinel.current) obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [page, hasMore, loading, load]);

  return (
    <div className="min-h-screen px-4 pb-24 pt-24 md:px-10">
      <h1 className="mb-2 text-3xl font-black tracking-tight md:text-4xl">
        {mt === "movie" ? "Movies" : "TV Shows"}
      </h1>
      <p className="mb-6 text-zinc-500">Browse thousands of titles in stunning quality.</p>

      <div className="mb-8 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Genre</label>
          <select
            value={genre || ""}
            onChange={(e) => setGenre(e.target.value ? Number(e.target.value) : null)}
            className="w-40 rounded-xl border border-white/10 bg-[#0c0c12] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          >
            <option value="">All Genres</option>
            {genres?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Original Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-40 rounded-xl border border-white/10 bg-[#0c0c12] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          >
            <option value="">Any Original</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>



        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Target Age</label>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-40 rounded-xl border border-white/10 bg-[#0c0c12] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          >
            <option value="">Any Age</option>
            {AGE_GROUPS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-lg font-semibold text-red-400">Failed to load</p>
          <p className="mt-1 text-sm text-zinc-500">{error}</p>
          <button onClick={() => load(1, true)} className="mt-4 rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold hover:bg-violet-500 transition">
            Retry
          </button>
        </div>
      )}
      {filteredItems.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-zinc-400">No movies found</p>
          <p className="mt-1 text-sm text-zinc-600">Try a different filter combination.</p>
        </div>
      )}
      {(filteredItems.length > 0 || loading) && (
      <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {filteredItems.map((item, i) => (
          <motion.div
            key={`${item.id}-${i}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <MediaCard item={{ ...item, media_type: mt }} />
          </motion.div>
        ))}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`s-${i}`}
              className="aspect-[2/3] w-[168px] rounded-xl shimmer"
            />
          ))}
      </div>
      )}
      <div ref={sentinel} className="h-10" />
    </div>
  );
}


