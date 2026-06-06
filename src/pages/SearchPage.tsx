import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useSearch, useTrending } from "../hooks/queries";
import { useStore } from "../store/useStore";
import MediaCard from "../components/MediaCard";
import { Search, Mic, Sparkle } from "../components/icons";

const MOODS = [
  { label: "😌 Relaxing", q: "comedy" },
  { label: "😱 Thrilling", q: "thriller" },
  { label: "💖 Romance", q: "romance" },
  { label: "🚀 Sci-Fi", q: "sci-fi" },
  { label: "👻 Horror Night", q: "horror" },
  { label: "🏆 Award Winners", q: "drama" },
  { label: "👨‍👩‍👧 Family", q: "family" },
  { label: "🔫 Action Packed", q: "action" },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("q") || "");
  const [query, setQuery] = useState(params.get("q") || "");
  const { data, isLoading, isError, error } = useSearch(query);
  const trending = useTrending("day");
  const { recentSearches, addSearch } = useStore();
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input);
      if (input.trim()) {
        setParams({ q: input });
        if (input.trim().length > 2) addSearch(input.trim());
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const voiceSearch = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setListening(true);
      setTimeout(() => setListening(false), 2000);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.start();
  };

  const results = (data || []).filter(
    (r) => (r.media_type as string) !== "person" && (r.poster_path || r.backdrop_path)
  );

  return (
    <div className="min-h-screen px-4 pb-24 pt-24 md:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="relative mb-6">
          <Search
            width={22}
            height={22}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search movies, shows, genres, moods…"
            className="w-full rounded-2xl glass py-4 pl-14 pr-16 text-lg outline-none placeholder:text-zinc-500 focus:neon-border"
          />
          <button
            onClick={voiceSearch}
            className={`absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full transition ${
              listening
                ? "bg-red-500 text-white animate-pulse"
                : "text-zinc-400 hover:bg-white/10"
            }`}
          >
            <Mic width={20} height={20} />
          </button>
        </div>

        {!query && (
          <>
            <div className="mb-8">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
                <Sparkle width={16} height={16} className="text-violet-400" />{" "}
                Search by Mood
              </h3>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => setInput(m.q)}
                    className="rounded-full glass px-4 py-2 text-sm transition hover:bg-white/10 hover:neon-border"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {recentSearches.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Recent
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
              🔥 Trending Searches
            </h3>
            <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-6">
              {trending.data?.slice(0, 12).map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>

      {query && (
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-zinc-400">
            {isLoading
              ? "Searching…"
              : isError
              ? `Search failed: ${(error as any)?.message || "unknown error"}`
              : `${results.length} results for "${query}"`}
          </p>
          <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] w-[168px] rounded-xl shimmer"
                  />
                ))
              : results.map((item, i) => (
                  <motion.div
                    key={`${item.id}-${i}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  >
                    <MediaCard item={item} />
                  </motion.div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
