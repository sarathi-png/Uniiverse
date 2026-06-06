import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useGenres, useDiscover } from "../hooks/queries";
import { useAmbientColor } from "../hooks/useTitleColor";
import MediaCard from "../components/MediaCard";
import { Compass } from "../components/icons";
import { useStore } from "../store/useStore";

export default function Explore() {
  const { data: movieGenres } = useGenres("movie");
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(
    null
  );
  const { ageConfirmed, confirmAge } = useStore();

  const extendedGenres = useMemo(() => {
    if (!movieGenres) return [];
    return [...movieGenres, { id: -1, name: "18+ Adult & Steamy Romance" }];
  }, [movieGenres]);

  const discoverParams = useMemo(() => {
    if (!selected) return {};
    if (selected.id === -1) {
      return {
        include_adult: true,
        with_genres: 10749, // Romance
        certification_country: "US",
        certification: "R|NC-17",
        sort_by: "popularity.desc"
      };
    }
    return { with_genres: selected.id, sort_by: "popularity.desc" };
  }, [selected]);

  const byGenre = useDiscover("movie", discoverParams, !!selected);

  return (
    <div className="min-h-screen px-4 pb-24 pt-24 md:px-10">
      <h1 className="mb-2 flex items-center gap-3 text-3xl font-black tracking-tight md:text-4xl">
        <Compass width={30} height={30} className="text-violet-400" /> Genre Explorer
      </h1>
      <p className="mb-8 text-zinc-500">Dive into worlds curated by genre.</p>

      {!selected ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {extendedGenres.map((g, i) => (
            <GenreTile
              key={g.id}
              genre={g}
              index={i}
              onClick={() => setSelected(g)}
            />
          ))}
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelected(null)}
            className="mb-6 rounded-full glass px-5 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            ← All genres
          </button>
          <h2 className="mb-4 text-2xl font-bold">{selected.name}</h2>
          
          {selected.id === -1 && !ageConfirmed ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                <span className="text-2xl font-black">18+</span>
              </div>
              <h3 className="mb-2 text-xl font-bold">Age Restricted Category</h3>
              <p className="mb-6 max-w-sm text-sm text-zinc-400">
                This category contains mature, adult, and steamy romance content. You must be at least 18 years old to view these titles.
              </p>
              <button
                onClick={confirmAge}
                className="rounded-full bg-red-600 px-6 py-3 font-bold transition hover:bg-red-500"
              >
                I Confirm I am 18 or older
              </button>
            </div>
          ) : byGenre.isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-semibold text-red-400">Failed to load</p>
              <p className="mt-1 text-sm text-zinc-500">{(byGenre.error as any)?.message || "TMDB API error"}</p>
              <button onClick={() => byGenre.refetch()} className="mt-4 rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold hover:bg-violet-500 transition">
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {byGenre.isLoading
                ? Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] w-[168px] rounded-xl shimmer"
                    />
                  ))
                : byGenre.data?.map((item) => (
                    <MediaCard key={item.id} item={{ ...item, media_type: "movie" }} />
                  ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GenreTile({
  genre,
  index,
  onClick,
}: {
  genre: { id: number; name: string };
  index: number;
  onClick: () => void;
}) {
  const [c1, c2] = useAmbientColor(genre.id);
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="group relative h-32 overflow-hidden rounded-2xl ring-1 ring-white/10"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/0" />
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl transition group-hover:scale-150" />
      <span className="absolute bottom-4 left-4 text-xl font-black tracking-tight drop-shadow-lg">
        {genre.name}
      </span>
    </motion.button>
  );
}
