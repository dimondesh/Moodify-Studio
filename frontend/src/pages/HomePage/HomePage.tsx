import { useEffect } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import FeaturedSection from "./FeaturedSection";
import SectionGrid from "./SectionGrid";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { ScrollArea } from "../../components/ui/scroll-area";
import { usePlaylistStore } from "../../stores/usePlaylistStore"; // Импортируем usePlaylistStore
import PlaylistGrid from "../SearchPage/PlaylistGrid"; // Импортируем PlaylistGrid

const HomePage = () => {
  const {
    fetchFeaturedSongs,
    fetchMadeForYouSongs,
    fetchTrendingSongs,
    isLoading, // Общий isLoading для MusicStore
    madeForYouSongs,
    trendingSongs,
    featuredSongs,
  } = useMusicStore();

  const {
    fetchPublicPlaylists,
    publicPlaylists,
    isLoading: isPlaylistsLoading, // isLoading specifically for playlists
  } = usePlaylistStore(); // Используем PlaylistStore

  const { initializeQueue, toggleShuffle, isShuffle } = usePlayerStore();

  useEffect(() => {
    fetchFeaturedSongs();
    fetchTrendingSongs();
    fetchMadeForYouSongs();
    fetchPublicPlaylists(); // Загружаем публичные плейлисты
  }, [
    fetchFeaturedSongs,
    fetchTrendingSongs,
    fetchMadeForYouSongs,
    fetchPublicPlaylists, // Добавляем в зависимости
  ]);

  useEffect(() => {
    if (
      madeForYouSongs.length > 0 &&
      featuredSongs.length > 0 &&
      trendingSongs.length > 0
    ) {
      const allSongs = [...featuredSongs, ...madeForYouSongs, ...trendingSongs];
      initializeQueue(allSongs);
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">
            {" "}
            {/* Добавил text-white */}
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
            {publicPlaylists.length > 0 && ( // Новая секция для плейлистов
              <PlaylistGrid
                title="Playlists For You"
                playlists={publicPlaylists}
                isLoading={isPlaylistsLoading} // Используем isLoading от PlaylistStore
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </main>
  );
};
export default HomePage;
