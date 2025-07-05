import { useEffect } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import FeaturedSection from "./FeaturedSection";
import SectionGrid from "./SectionGrid";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { ScrollArea } from "../../components/ui/scroll-area";

const HomePage = () => {
  const {
    fetchFeaturedSongs,
    fetchMadeForYouSongs,
    fetchTrendingSongs,
    isLoading,
    madeForYouSongs,
    trendingSongs,
    featuredSongs,
  } = useMusicStore();

  const { initializeQueue, toggleShuffle, isShuffle } = usePlayerStore();

  useEffect(() => {
    fetchFeaturedSongs();
    fetchTrendingSongs();
    fetchMadeForYouSongs();
  }, [fetchFeaturedSongs, fetchTrendingSongs, fetchMadeForYouSongs]);

  useEffect(() => {
    if (
      madeForYouSongs.length > 0 &&
      featuredSongs.length > 0 &&
      trendingSongs.length > 0
    ) {
      const allSongs = [...featuredSongs, ...madeForYouSongs, ...trendingSongs];
      initializeQueue(allSongs);

      // Включаем shuffle, если он ещё выключен
    }
  }, [
    initializeQueue,
    madeForYouSongs,
    featuredSongs,
    trendingSongs,
    isShuffle,
    toggleShuffle,
  ]);

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-900 to-zinc-950">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">
            {getGreeting()}
          </h1>

          <FeaturedSection />

          <div className="space-y-8">
            <SectionGrid
              title="Made For You"
              songs={madeForYouSongs}
              isLoading={isLoading}
              showAllPath="/full-songs"
            />
            <SectionGrid
              title="Trending"
              songs={trendingSongs}
              isLoading={isLoading}
              showAllPath="/full-songs"
            />
          </div>
        </div>
      </ScrollArea>
    </main>
  );
};
export default HomePage;
