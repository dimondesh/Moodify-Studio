// src/pages/HomePage/HomePage.tsx

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import FeaturedSection from "./FeaturedSection";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { useMixesStore } from "../../stores/useMixesStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useOfflineStore } from "@/stores/useOfflineStore";
import { useDominantColor } from "@/hooks/useDominantColor";
import { Song } from "@/types";
import { useGeneratedPlaylistStore } from "../../stores/useGeneratedPlaylistStore";
import HorizontalSection from "./HorizontalSection";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../stores/useUIStore";
import HomePageSkeleton from "./HomePageSkeleton";

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    fetchHomePageData,
    recentlyListenedSongs,
    madeForYouSongs,
    trendingSongs,
    featuredSongs,
    favoriteArtists,
    newReleases,
  } = useMusicStore();

  const { genreMixes, moodMixes } = useMixesStore();
  const { user } = useAuthStore();
  const { publicPlaylists, recommendedPlaylists } = usePlaylistStore();
  const { allGeneratedPlaylists } = useGeneratedPlaylistStore();

  const { isHomePageLoading } = useUIStore();
  const { initializeQueue, currentSong } = usePlayerStore();
  const { isOffline } = useOfflineStore();
  const { extractColor } = useDominantColor();

  const [backgrounds, setBackgrounds] = useState([
    { key: 0, color: "#18181b" },
  ]);
  const backgroundKeyRef = useRef(0);
  const defaultColorRef = useRef("#18181b");

  useEffect(() => {
    fetchHomePageData();
  }, [user, isOffline, fetchHomePageData]);

  const changeBackgroundColor = useCallback((color: string) => {
    backgroundKeyRef.current += 1;
    const newKey = backgroundKeyRef.current;
    setBackgrounds((prev) => [{ key: newKey, color }, ...prev.slice(0, 1)]);
  }, []);

  useEffect(() => {
    if (featuredSongs.length > 0 && !isHomePageLoading) {
      extractColor(featuredSongs[0].imageUrl).then((color) => {
        const newDefaultColor = color || "#18181b";
        defaultColorRef.current = newDefaultColor;
        if (backgrounds.length === 1 && backgrounds[0].color === "#18181b") {
          changeBackgroundColor(newDefaultColor);
        }
      });
    }
  }, [
    featuredSongs,
    extractColor,
    backgrounds,
    isHomePageLoading,
    changeBackgroundColor,
  ]);

  useEffect(() => {
    if (
      currentSong === null &&
      !isHomePageLoading &&
      (madeForYouSongs.length > 0 ||
        featuredSongs.length > 0 ||
        trendingSongs.length > 0)
    ) {
      const allSongs = [...featuredSongs, ...madeForYouSongs, ...trendingSongs];
      if (allSongs.length > 0) {
        initializeQueue(allSongs);
      }
    }
  }, [
    initializeQueue,
    madeForYouSongs,
    featuredSongs,
    trendingSongs,
    currentSong,
    isHomePageLoading,
  ]);

  const handleSongHover = useCallback(
    (song: Song) => {
      extractColor(song.imageUrl).then((color) => {
        changeBackgroundColor(color || "#18181b");
      });
    },
    [extractColor, changeBackgroundColor]
  );

  const handleSongLeave = useCallback(() => {
    changeBackgroundColor(defaultColorRef.current);
  }, [changeBackgroundColor]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greetings.morning");
    if (hour < 18) return t("greetings.afternoon");
    return t("greetings.evening");
  };

  const recommendedPlaylistsItems = useMemo(
    () =>
      recommendedPlaylists.map((pl) => ({
        ...pl,
        itemType: "playlist" as const,
      })),
    [recommendedPlaylists]
  );
  const newReleasesItems = useMemo(
    () =>
      newReleases.map((album) => ({ ...album, itemType: "album" as const })),
    [newReleases]
  );
  const favoriteArtistsItems = useMemo(
    () =>
      favoriteArtists.map((artist) => ({
        ...artist,
        itemType: "artist" as const,
      })),
    [favoriteArtists]
  );
  const madeForYouSongsItems = useMemo(
    () =>
      madeForYouSongs.map((song) => ({ ...song, itemType: "song" as const })),
    [madeForYouSongs]
  );
  const trendingSongsItems = useMemo(
    () => trendingSongs.map((song) => ({ ...song, itemType: "song" as const })),
    [trendingSongs]
  );
  const recentlyListenedItems = useMemo(
    () =>
      recentlyListenedSongs.map((song) => ({
        ...song,
        itemType: "song" as const,
      })),
    [recentlyListenedSongs]
  );
  const genreMixesItems = useMemo(
    () => genreMixes.map((mix) => ({ ...mix, itemType: "mix" as const })),
    [genreMixes]
  );
  const moodMixesItems = useMemo(
    () => moodMixes.map((mix) => ({ ...mix, itemType: "mix" as const })),
    [moodMixes]
  );
  const publicPlaylistsItems = useMemo(
    () =>
      publicPlaylists.map((pl) => ({ ...pl, itemType: "playlist" as const })),
    [publicPlaylists]
  );
  const generatedPlaylistsItems = useMemo(
    () =>
      allGeneratedPlaylists.map((pl) => ({
        ...pl,
        itemType: "generated-playlist" as const,
      })),
    [allGeneratedPlaylists]
  );

  const handleShowAllMadeForYou = useCallback(
    () =>
      navigate("/all-songs/made-for-you", {
        state: { songs: madeForYouSongs, title: t("homepage.madeForYou") },
      }),
    [navigate, madeForYouSongs, t]
  );
  const handleShowAllRecentlyListened = useCallback(
    () =>
      navigate("/all-songs/recently-listened", {
        state: {
          songs: recentlyListenedSongs,
          title: t("homepage.recentlyListened"),
        },
      }),
    [navigate, recentlyListenedSongs, t]
  );
  const handleShowAllGenreMixes = useCallback(
    () =>
      navigate(`/all-mixes/genres`, {
        state: { mixes: genreMixes, title: t("homepage.genreMixes") },
      }),
    [navigate, genreMixes, t]
  );
  const handleShowAllMoodMixes = useCallback(
    () =>
      navigate(`/all-mixes/moods`, {
        state: { mixes: moodMixes, title: t("homepage.moodMixes") },
      }),
    [navigate, moodMixes, t]
  );
  const handleShowAllTrending = useCallback(
    () =>
      navigate("/all-songs/trending", {
        state: { songs: trendingSongs, title: t("homepage.trending") },
      }),
    [navigate, trendingSongs, t]
  );

  return (
    <>
      <Helmet>
        <title>Home</title>
        <meta
          name="description"
          content="Listen to trending music, discover personal mixes, and explore public playlists. Moodify - your ultimate guide in the world of music."
        />
      </Helmet>
      <main className="rounded-md overflow-y-auto h-full bg-gradient-to-b from-zinc-900 to-zinc-950 hide-scrollbar">
        <div className="relative min-h-screen">
          <div className="absolute hidden lg:block inset-0 h-[60vh] w-full pointer-events-none z-0">
            {backgrounds
              .slice(0, 2)
              .reverse()
              .map((bg, index) => (
                <div
                  key={bg.key}
                  className={`absolute inset-0 ${
                    index === 1 ? "animate-fade-in" : ""
                  }`}
                  aria-hidden="true"
                  style={{
                    background: `linear-gradient(to bottom, ${bg.color}, transparent 60%)`,
                  }}
                />
              ))}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
              }}
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10">
            {isHomePageLoading ? (
              <HomePageSkeleton />
            ) : (
              <div className="p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">
                  {getGreeting()}
                </h1>

                <FeaturedSection
                  onSongHover={handleSongHover}
                  onSongLeave={handleSongLeave}
                />

                <div className="space-y-8">
                  {user && madeForYouSongs.length > 0 && (
                    <HorizontalSection
                      title={t("homepage.madeForYou")}
                      items={madeForYouSongsItems}
                      isLoading={false}
                      limit={12}
                      t={t}
                      onShowAll={handleShowAllMadeForYou}
                    />
                  )}
                  {user && recentlyListenedSongs.length > 0 && (
                    <HorizontalSection
                      title={t("homepage.recentlyListened")}
                      items={recentlyListenedItems}
                      isLoading={false}
                      t={t}
                      limit={12}
                      onShowAll={handleShowAllRecentlyListened}
                    />
                  )}
                  <HorizontalSection
                    title={t("homepage.genreMixes")}
                    items={genreMixesItems}
                    isLoading={false}
                    t={t}
                    limit={12}
                    onShowAll={handleShowAllGenreMixes}
                  />
                  <HorizontalSection
                    title={t("homepage.moodMixes")}
                    items={moodMixesItems}
                    isLoading={false}
                    t={t}
                    limit={12}
                    onShowAll={handleShowAllMoodMixes}
                  />
                  <HorizontalSection
                    title={t("homepage.trending")}
                    items={trendingSongsItems}
                    isLoading={false}
                    t={t}
                    limit={12}
                    onShowAll={handleShowAllTrending}
                  />
                  {user && favoriteArtists.length > 0 && (
                    <HorizontalSection
                      title={t("homepage.favoriteArtists")}
                      items={favoriteArtistsItems}
                      t={t}
                      limit={12}
                      isLoading={false}
                    />
                  )}
                  {user && newReleases.length > 0 && (
                    <HorizontalSection
                      title={t("homepage.newReleases")}
                      t={t}
                      items={newReleasesItems}
                      isLoading={false}
                      limit={12}
                    />
                  )}
                  {user && recommendedPlaylists.length > 0 && (
                    <HorizontalSection
                      title={t("homepage.playlistsForYou")}
                      items={recommendedPlaylistsItems}
                      t={t}
                      isLoading={false}
                      limit={12}
                    />
                  )}
                  {allGeneratedPlaylists.length > 0 && (
                    <HorizontalSection
                      title={t("homepage.generatedForYou")}
                      items={generatedPlaylistsItems}
                      t={t}
                      isLoading={false}
                      limit={12}
                    />
                  )}
                  {publicPlaylists.length > 0 && (
                    <HorizontalSection
                      title={t("homepage.publicPlaylists")}
                      items={publicPlaylistsItems}
                      t={t}
                      isLoading={false}
                      limit={12}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};
export default HomePage;
