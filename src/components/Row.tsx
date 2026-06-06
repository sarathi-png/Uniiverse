import { useRef } from "react";
import { motion } from "framer-motion";
import type { MediaItem } from "../api/tmdb";
import MediaCard from "./MediaCard";
import { ChevronLeft, ChevronRight } from "./icons";

interface Props {
  title: string;
  items?: MediaItem[];
  loading?: boolean;
  numbered?: boolean;
  accent?: string;
}

export default function Row({ title, items, loading, numbered, accent }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 700, behavior: "smooth" });
  };

  return (
    <section className="group/row relative my-8">
      <div className="mb-3 flex items-center gap-3 px-4 md:px-10">
        {accent && (
          <span
            className="h-5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
        )}
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 z-30 hidden h-full w-12 items-center justify-center bg-gradient-to-r from-black/80 to-transparent opacity-0 transition group-hover/row:opacity-100 md:flex"
        >
          <ChevronLeft width={28} height={28} />
        </button>
        <div
          ref={ref}
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 pb-8 pt-2 md:px-10"
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] w-[168px] shrink-0 rounded-xl shimmer"
                />
              ))
            : items?.map((item, i) => (
                <motion.div
                  key={`${item.id}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "100px" }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <MediaCard
                    item={item}
                    index={i}
                    rank={numbered ? i + 1 : undefined}
                  />
                </motion.div>
              ))}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 z-30 hidden h-full w-12 items-center justify-center bg-gradient-to-l from-black/80 to-transparent opacity-0 transition group-hover/row:opacity-100 md:flex"
        >
          <ChevronRight width={28} height={28} />
        </button>
      </div>
    </section>
  );
}
