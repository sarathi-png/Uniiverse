import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import MediaCard from "../components/MediaCard";
import { Bookmark, Clock, Search } from "../components/icons";

export default function Watchlist() {
  const { watchlist, watchHistory } = useStore();
  const [tab, setTab] = useState<"list" | "history">("list");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "alpha" | "rating">("recent");

  const displayItems = useMemo(() => {
    let items = tab === "list" ? [...watchlist] : [...watchHistory];
    
    if (search.trim()) {
      items = items.filter((i) => 
        (i.title || i.name || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    if (tab === "list") {
      if (sortBy === "alpha") {
        items.sort((a, b) => (a.title || a.name || "").localeCompare(b.title || b.name || ""));
      } else if (sortBy === "rating") {
        items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      }
    }
    
    return items;
  }, [tab, watchlist, watchHistory, search, sortBy]);

  return (
    <div className="min-h-screen px-4 pb-24 pt-24 md:px-10">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-black tracking-tight md:text-4xl">
            {tab === "list" ? <Bookmark width={30} height={30} className="text-violet-400" /> : <Clock width={30} height={30} className="text-amber-400" />} 
            {tab === "list" ? "My List" : "Watch History"}
          </h1>
          <p className="text-zinc-500">
            {displayItems.length} title{displayItems.length !== 1 ? "s" : ""} {tab === "list" ? "saved" : "watched recently"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 rounded-full bg-white/5 py-2 pl-9 pr-4 text-sm outline-none border border-white/10 focus:border-violet-500 transition"
            />
          </div>
          
          {tab === "list" && (
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-full bg-white/5 py-2 px-4 text-sm outline-none border border-white/10 focus:border-violet-500 cursor-pointer"
            >
              <option value="recent" className="bg-black">Recently Added</option>
              <option value="alpha" className="bg-black">A-Z</option>
              <option value="rating" className="bg-black">Rating</option>
            </select>
          )}

          <div className="flex rounded-full bg-white/5 p-1 border border-white/10">
            <button 
              onClick={() => setTab("list")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "list" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Watchlist
            </button>
            <button 
              onClick={() => setTab("history")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "history" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"}`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl glass">
            <Bookmark width={36} height={36} className="text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold">Your list is empty</h2>
          <p className="max-w-sm text-zinc-500">
            Add movies and shows to keep track of what you want to watch.
          </p>
          <Link
            to="/"
            className="rounded-full bg-violet-600 px-6 py-3 text-sm font-bold transition hover:bg-violet-500"
          >
            Browse titles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {watchlist.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
            >
              <MediaCard item={item} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
