import Hero from "../components/Hero";
import Row from "../components/Row";
import { useStore } from "../store/useStore";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
import WatchHistoryRow from "../components/WatchHistoryRow";
import {
  useTrending,
  usePopular,
  useTopRated,
  useUpcoming,
  useAiringToday,
  useDiscover,
} from "../hooks/queries";
import { getPersonalizedPicks } from "../utils/recommendations";

export default function Home() {
  const trending = useTrending("week");
  const trendingDay = useTrending("day");
  const popularMovies = usePopular("movie");
  const popularTv = usePopular("tv");
  const topMovies = useTopRated("movie");
  const upcoming = useUpcoming();
  const airing = useAiringToday();
  const { continueWatching, watchHistory } = useStore();
  const aiPicks = getPersonalizedPicks(trending.data || [], continueWatching);

  const anime = useDiscover("tv", {
    with_genres: 16,
    with_original_language: "ja",
    sort_by: "popularity.desc",
  });
  const kdrama = useDiscover("tv", {
    with_original_language: "ko",
    sort_by: "popularity.desc",
    without_genres: "16",
  });

  return (
    <div className="pb-20 md:pb-10">
      <Hero items={trending.data || []} />

      <div className="relative z-10 -mt-24">
        {continueWatching.length > 0 && (
          <ContinueWatchingRow items={continueWatching} />
        )}
        {watchHistory.length > 0 && (
          <WatchHistoryRow items={watchHistory} />
        )}
        {aiPicks.length > 0 && (
          <Row
            title="🤖 AI Picks For You"
            items={aiPicks}
            accent="linear-gradient(#8b5cf6,#06b6d4)"
          />
        )}
        <Row
          title="🔥 Trending Today"
          items={trendingDay.data}
          loading={trendingDay.isLoading}
          accent="linear-gradient(#f97316,#ef4444)"
        />
        <Row
          title="Top 10 in Your Region"
          items={trending.data?.slice(0, 10)}
          loading={trending.isLoading}
          numbered
          accent="linear-gradient(#8b5cf6,#d946ef)"
        />
        <Row
          title="NOVA Originals"
          items={popularTv.data}
          loading={popularTv.isLoading}
          accent="linear-gradient(#06b6d4,#3b82f6)"
        />
        <Row
          title="Blockbuster Movies"
          items={popularMovies.data}
          loading={popularMovies.isLoading}
        />
        <Row
          title="🎌 Anime Spotlight"
          items={anime.data}
          loading={anime.isLoading}
          accent="linear-gradient(#ec4899,#8b5cf6)"
        />
        <Row
          title="🇰🇷 K-Drama Favorites"
          items={kdrama.data}
          loading={kdrama.isLoading}
          accent="linear-gradient(#f43f5e,#fb7185)"
        />
        <Row
          title="Critically Acclaimed"
          items={topMovies.data}
          loading={topMovies.isLoading}
          accent="linear-gradient(#eab308,#f59e0b)"
        />
        <Row title="New Releases" items={upcoming.data} loading={upcoming.isLoading} />
        <Row
          title="Airing Today on TV"
          items={airing.data}
          loading={airing.isLoading}
        />
      </div>
    </div>
  );
}
