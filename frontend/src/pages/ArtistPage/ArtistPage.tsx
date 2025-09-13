// frontend/src/pages/ArtistPage/ArtistPage.tsx

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom"; // useNavigate уже здесь
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Play, Heart, UserPlus, UserCheck, Pause, Loader2 } from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import toast from "react-hot-toast";
import { useLibraryStore } from "../../stores/useLibraryStore";
import Equalizer from "../../components/ui/equalizer";
import type { Artist, Song, Album } from "../../types";
import { axiosInstance } from "@/lib/axios";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useOfflineStore } from "@/stores/useOfflineStore";
import { useMusicStore } from "../../stores/useMusicStore";
import { getArtistNames, getOptimizedImageUrl } from "@/lib/utils";
import HorizontalSection from "../HomePage/HorizontalSection";

const ArtistPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate(); // Инициализируем useNavigate
  const { currentSong, isPlaying, playAlbum, setCurrentSong, togglePlay } =
    usePlayerStore();
  const { isSongLiked, toggleSongLike, isArtistFollowed, toggleArtistFollow } =
    useLibraryStore();
  const { artistAppearsOn, isAppearsOnLoading, fetchArtistAppearsOn } =
    useMusicStore();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (useOfflineStore.getState().isOffline) return;

      if (!id) {
        setError("Artist ID is missing.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const artistRes = await axiosInstance.get<Artist>(`/artists/${id}`);
        fetchArtistAppearsOn(id);
        setArtist(artistRes.data);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch artist data:", err);
        let errorMessage = t("pages.artist.error");
        if (axios.isAxiosError(err) && err.response) {
          errorMessage = err.response.data.message || errorMessage;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setArtist(null);
      } finally {
        setLoading(false);
      }
    };
    fetchArtistData();
  }, [id, t, fetchArtistAppearsOn]);

  const { popularSongs, albums, singlesAndEps } = useMemo(() => {
    const allArtistSongs: Song[] = artist?.songs || [];
    const allArtistAlbums: Album[] = artist?.albums || [];
    return {
      popularSongs: allArtistSongs.slice(0, 5),
      albums: allArtistAlbums.filter((album) => album.type === "Album"),
      singlesAndEps: allArtistAlbums.filter(
        (album) => album.type === "Single" || album.type === "EP"
      ),
    };
  }, [artist]);

  const albumsItems = useMemo(
    () => albums.map((album) => ({ ...album, itemType: "album" as const })),
    [albums]
  );
  const singlesAndEpsItems = useMemo(
    () =>
      singlesAndEps.map((album) => ({ ...album, itemType: "album" as const })),
    [singlesAndEps]
  );
  const appearsOnItems = useMemo(
    () =>
      artistAppearsOn.map((album) => ({
        ...album,
        itemType: "album" as const,
      })),
    [artistAppearsOn]
  );

  const handleShowAllAlbums = useCallback(() => {
    navigate("/list", {
      state: {
        title: t("pages.artist.albums"),
        items: albumsItems, // Передаем готовый массив
      },
    });
  }, [navigate, t, albumsItems]);

  const handleShowAllSinglesAndEps = useCallback(() => {
    navigate("/list", {
      state: {
        title: t("pages.artist.singlesAndEps"),
        items: singlesAndEpsItems, // Передаем готовый массив
      },
    });
  }, [navigate, t, singlesAndEpsItems]);

  const handleShowAllAppearsOn = useCallback(() => {
    navigate("/list", {
      state: {
        title: t("pages.artist.appearsOn"),
        items: appearsOnItems, // Передаем готовый массив
      },
    });
  }, [navigate, t, appearsOnItems]);

  const isAnyPopularSongPlaying = useMemo(
    () =>
      isPlaying && popularSongs.some((song) => song._id === currentSong?._id),
    [isPlaying, popularSongs, currentSong]
  );

  const handlePlayArtistSongs = useCallback(() => {
    if (popularSongs.length === 0) {
      toast.error("No popular songs available to play.");
      return;
    }
    if (isAnyPopularSongPlaying) togglePlay();
    else playAlbum(popularSongs, 0);
  }, [popularSongs, isAnyPopularSongPlaying, togglePlay, playAlbum]);

  const handlePlaySpecificSong = useCallback(
    (song: Song, index: number) => {
      if (currentSong?._id === song._id) togglePlay();
      else {
        setCurrentSong(song);
        playAlbum(popularSongs, index);
      }
    },
    [currentSong, togglePlay, setCurrentSong, playAlbum, popularSongs]
  );

  const handleToggleFollow = useCallback(async () => {
    if (!artist) return;
    try {
      await toggleArtistFollow(artist._id);
      toast.success(
        isArtistFollowed(artist._id)
          ? `Now you are following ${artist.name}`
          : `You unfollowed ${artist.name}`
      );
    } catch (e) {
      toast.error("Failed to change follow status");
      console.error("Error toggling artist follow:", e);
    }
  }, [artist, toggleArtistFollow, isArtistFollowed]);

  if (loading) {
    return (
      <main className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-violet-500 size-12" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex items-center justify-center h-full text-red-500">
        <p>{error}</p>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="flex items-center justify-center h-full text-zinc-400">
        <p>{t("pages.artist.notFound")}</p>
      </main>
    );
  }
  const metaDescription = `Listen to ${
    artist.name
  } on Moodify. Discover popular tracks, albums, and the full discography. ${
    artist.bio ? artist.bio.substring(0, 120) + "..." : ""
  }`;

  return (
    <>
      <Helmet>
        <title>{`${artist.name}`}</title>
        <meta name="description" content={metaDescription} />
      </Helmet>
      <div className="bg-zinc-950 overflow-y-auto h-full hide-scrollbar pb-30 lg:pb-0">
        <div className="relative w-full h-[340px] sm:h-[300px] md:h-[300px] lg:h-[400px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${getOptimizedImageUrl(
                (window.innerWidth >= 1024
                  ? artist.bannerUrl
                  : artist.imageUrl) || "https://moodify.b-cdn.net/artist.jpeg",
                800
              )})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-zinc-950 z-0" />
          {!artist.bannerUrl && artist.imageUrl && (
            <div className="hidden lg:block absolute bottom-10 left-10 z-10">
              <div className="w-40 h-40 rounded-full overflow-hidden shadow-2xl border-4 border-white/10">
                <img
                  src={getOptimizedImageUrl(artist.imageUrl, 400)}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          <div
            className={`relative z-10 h-full flex flex-col justify-end px-6 sm:px-10 pb-6 sm:pb-10 ${
              !artist.bannerUrl && artist.imageUrl ? "lg:ml-56" : ""
            }`}
          >
            <p className="text-white text-sm font-semibold uppercase mb-2">
              {t("pages.artist.type")}
            </p>
            <h1 className="text-white text-4xl sm:text-6xl md:text-7xl font-bold leading-tight">
              {artist.name}
            </h1>
            <div className="mt-4 flex items-center gap-4">
              <Button
                className="bg-violet-500 hover:bg-violet-600 text-black rounded-full h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center transition-transform hover:scale-105"
                onClick={handlePlayArtistSongs}
                title={
                  isAnyPopularSongPlaying
                    ? t("pages.artist.actions.pause")
                    : `${t("pages.artist.actions.play")} ${artist.name}`
                }
              >
                {isAnyPopularSongPlaying ? (
                  <Pause className="h-7 w-7 fill-current" />
                ) : (
                  <Play className="h-7 w-7 fill-current" />
                )}
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-4 py-2 text-white border-zinc-500 hover:border-white hover:text-white flex items-center gap-2"
                onClick={handleToggleFollow}
              >
                {isArtistFollowed(artist._id) ? (
                  <>
                    <UserCheck className="h-5 w-5" />
                    {t("pages.artist.actions.following")}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    {t("pages.artist.actions.follow")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-8">
          {popularSongs.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {t("pages.artist.popular")}
              </h2>
              <div className="flex flex-col gap-2">
                {popularSongs.map((song, index) => {
                  const isCurrentSong = currentSong?._id === song._id;
                  return (
                    <div
                      key={song._id}
                      className="flex items-center gap-4 p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer group"
                      onClick={() => handlePlaySpecificSong(song, index)}
                    >
                      <div className="flex items-center justify-center w-4 text-zinc-400">
                        {isCurrentSong && isPlaying ? (
                          <Equalizer />
                        ) : (
                          <span className="group-hover:hidden">
                            {index + 1}
                          </span>
                        )}
                        {!isCurrentSong && (
                          <Play className="h-4 w-4 hidden group-hover:block" />
                        )}
                      </div>
                      <div className="w-12 h-12 flex-shrink-0">
                        <img
                          src={getOptimizedImageUrl(
                            song.imageUrl || "/default-song-cover.png",
                            100
                          )}
                          alt={song.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium ${
                            isCurrentSong ? "text-violet-400" : "text-white"
                          } truncate`}
                        >
                          {song.title}
                        </p>
                        <p className="text-zinc-400 text-sm truncate">
                          {getArtistNames(song.artist)}
                        </p>
                      </div>
                      <span className="text-zinc-400 text-sm ml-2 hidden sm:block">
                        {song.playCount?.toLocaleString() || 0}{" "}
                        {t("pages.artist.plays")}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`hover:text-white ${
                          isSongLiked(song._id)
                            ? "text-violet-500"
                            : "text-zinc-400 opacity-0 group-hover:opacity-100"
                        } w-8 h-8`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSongLike(song._id);
                        }}
                        title={
                          isSongLiked(song._id)
                            ? t("player.unlike")
                            : t("player.like")
                        }
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                      <span className="text-zinc-400 text-sm ml-2">
                        {formatTime(song.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <HorizontalSection
            title={t("pages.artist.albums")}
            items={albumsItems}
            isLoading={loading}
            t={t}
            limit={6}
            onShowAll={handleShowAllAlbums}
          />
          <HorizontalSection
            title={t("pages.artist.singlesAndEps")}
            items={singlesAndEpsItems}
            isLoading={loading}
            t={t}
            limit={6}
            onShowAll={handleShowAllSinglesAndEps}
          />
          <HorizontalSection
            title={t("pages.artist.appearsOn")}
            items={appearsOnItems}
            isLoading={isAppearsOnLoading}
            t={t}
            limit={6}
            onShowAll={handleShowAllAppearsOn}
          />
          {artist.bio && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {t("pages.artist.about")} {artist.name}
              </h2>
              <p className="text-zinc-300 whitespace-pre-wrap">{artist.bio}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default ArtistPage;
