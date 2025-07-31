// frontend/src/pages/HomePage/HomePage.tsx

import { useEffect } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import FeaturedSection from "./FeaturedSection";
import SectionGrid from "./SectionGrid";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { ScrollArea } from "../../components/ui/scroll-area";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import PlaylistGrid from "../SearchPage/PlaylistGrid";
import { useMixesStore } from "../../stores/useMixesStore";
import MixGrid from "./MixGrid";
import { useAuthStore } from "../../stores/useAuthStore";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useOfflineStore } from "@/stores/useOfflineStore";

const HomePage = () => {
  const { t } = useTranslation();
  const {
    fetchFeaturedSongs,
    fetchMadeForYouSongs,
    fetchTrendingSongs,
    fetchRecentlyListenedSongs,
    recentlyListenedSongs,

    isLoading,
    madeForYouSongs,
    trendingSongs,
    featuredSongs,
  } = useMusicStore();
  const {
    genreMixes,
    moodMixes,
    isLoading: areMixesLoading,
    fetchDailyMixes,
  } = useMixesStore();
  const { user } = useAuthStore();

  const {
    fetchPublicPlaylists,
    publicPlaylists,
    isLoading: isPlaylistsLoading,
  } = usePlaylistStore();

  const { initializeQueue, toggleShuffle, isShuffle, currentSong } =
    usePlayerStore();
  const { isOffline } = useOfflineStore();

  useEffect(() => {
    if (!isOffline) {
      fetchFeaturedSongs();
      fetchTrendingSongs();
      fetchDailyMixes();
      fetchPublicPlaylists();
      if (user) {
        fetchMadeForYouSongs();
        fetchRecentlyListenedSongs();
      }
    }
  }, [
    user,
    isOffline,
    fetchFeaturedSongs,
    fetchTrendingSongs,
    fetchMadeForYouSongs,
    fetchDailyMixes,
    fetchRecentlyListenedSongs,
    fetchPublicPlaylists,
  ]);

  useEffect(() => {
    if (
      currentSong === null &&
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
    currentSong,
  ]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greetings.morning");
    if (hour < 18) return t("greetings.afternoon");
    return t("greetings.evening");
  };

  return (
    <>
      <Helmet>
        <title>Home - Moodify</title>
        <meta
          name="description"
          content="Listen to trending music, discover personal mixes, and explore public playlists. Moodify - your ultimate guide in the world of music."
        />
      </Helmet>
      <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-900 to-zinc-950">
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">
              {getGreeting()}
            </h1>

            <FeaturedSection />

            <div className="space-y-8">
              {madeForYouSongs && recentlyListenedSongs.length >= 5 && (
                <SectionGrid
                  title={t("homepage.madeForYou")}
                  songs={madeForYouSongs}
                  isLoading={isLoading}
                  showAllPath="/full-songs"
                />
              )}
              {recentlyListenedSongs && recentlyListenedSongs.length >= 10 && (
                <SectionGrid
                  title={t("homepage.recentlyListened")}
                  songs={recentlyListenedSongs}
                  isLoading={isLoading}
                />
              )}
              <MixGrid
                title={t("homepage.genreMixes")}
                mixes={genreMixes}
                isLoading={areMixesLoading}
              />
              <MixGrid
                title={t("homepage.moodMixes")}
                mixes={moodMixes}
                isLoading={areMixesLoading}
              />
              <SectionGrid
                title={t("homepage.trending")}
                songs={trendingSongs}
                isLoading={isLoading}
                showAllPath="/full-songs"
              />
              {publicPlaylists.length > 0 && (
                <PlaylistGrid
                  title={t("homepage.playlistsForYou")}
                  playlists={publicPlaylists}
                  isLoading={isPlaylistsLoading}
                />
              )}
            </div>
          </div>
        </ScrollArea>
      </main>
    </>
  );
};
export default HomePage;
