// frontend/src/pages/ArtistPage/ArtistPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import AlbumGrid from "../SearchPage/AlbumGrid";
import { Play, Heart, UserPlus, UserCheck, Pause } from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import toast from "react-hot-toast";

import { useLibraryStore } from "../../stores/useLibraryStore";
import Equalizer from "../../components/ui/equalizer";

// Импортируем типы из центрального файла типов
import type { Artist, Song, Album } from "../../types";
import { axiosInstance } from "@/lib/axios";
import { usePlayCountStore } from "@/stores/usePlayCountStore";

const ArtistPage = () => {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentSong, isPlaying, playAlbum, setCurrentSong, togglePlay } =
    usePlayerStore();
  const { incrementPlayCount } = usePlayCountStore();

  const {
    isSongLiked,
    toggleSongLike,
    fetchLikedSongs,
    isArtistFollowed,
    toggleArtistFollow,
    fetchFollowedArtists,
  } = useLibraryStore();

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!id) {
        setError("Artist ID is missing.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const artistRes = await axiosInstance.get<Artist>(`/artists/${id}`);
        setArtist(artistRes.data);

        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch artist data:", err);
        let errorMessage =
          "Failed to load artist information. Please try again later.";
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
    fetchLikedSongs();
    fetchFollowedArtists();
  }, [id, fetchLikedSongs, fetchFollowedArtists]);

  if (loading) {
    return (
      <main className="rounded-md overflow-hidden h-full bg-zinc-950 flex items-center justify-center text-white">
        <p>Loading artist...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="rounded-md overflow-hidden h-full bg-zinc-950 flex items-center justify-center text-red-500">
        <p>{error}</p>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="rounded-md overflow-hidden h-full bg-zinc-950 flex items-center justify-center text-zinc-400">
        <p>Artist not found.</p>
      </main>
    );
  }

  const allArtistSongs: Song[] = artist.songs || [];
  const allArtistAlbums: Album[] = artist.albums || [];

  const popularSongs = allArtistSongs.slice(0, 5);

  const albums = allArtistAlbums.filter((album) => album.type === "Album");
  const singlesAndEps = allArtistAlbums.filter(
    (album) => album.type === "Single" || album.type === "EP"
  );

  const isAnyPopularSongPlaying =
    isPlaying && popularSongs.some((song) => song._id === currentSong?._id);

  const handlePlayArtistSongs = () => {
    if (popularSongs.length === 0) {
      toast.error("No popular songs available to play.");
      return;
    }

    if (isAnyPopularSongPlaying) {
      togglePlay();
    } else {
      playAlbum(popularSongs, 0);
      if (popularSongs[0]) {
        incrementPlayCount(popularSongs[0]._id);
      }
    }
  };

  const handlePlaySpecificSong = (song: Song, index: number) => {
    if (currentSong?._id === song._id) {
      togglePlay();
    } else {
      setCurrentSong(song);
      playAlbum(popularSongs, index);
    }
    incrementPlayCount(song._id);
  };

  const getArtistNames = (
    artistData: (Artist | string)[] | undefined
  ): string => {
    if (!artistData || artistData.length === 0) {
      return "Unknown Artist";
    }
    return artistData
      .map((item) => {
        if (typeof item === "object" && item !== null && "name" in item) {
          return item.name;
        }
        return String(item);
      })
      .join(", ");
  };

  const handleToggleFollow = async () => {
    if (!artist) return;
    try {
      await toggleArtistFollow(artist._id);
      toast.success(
        isArtistFollowed(artist._id)
          ? `Вы отписались от ${artist.name}`
          : `Вы подписались на ${artist.name}`
      );
    } catch (e) {
      toast.error("Не удалось изменить статус подписки.");
      console.error("Error toggling artist follow:", e);
    }
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-zinc-950">
      <ScrollArea className="h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-170px)] w-full pb-20 md:pb-0">
        <div className="relative w-full h-[340px] sm:h-[300px] md:h-[300px] lg:h-[400px]">
          {/* Фон (баннер или аватарка как фон, либо градиент на десктопе) */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                window.innerWidth >= 1024
                  ? artist.bannerUrl
                    ? `url(${artist.bannerUrl})` // ✅ десктоп с баннером
                    : "linear-gradient(to bottom, #333, #111)" // ❌ десктоп без баннера
                  : `url(${artist.imageUrl || "/default-artist-cover.png"})`, // ✅ мобила/планшет — всегда аватарка
            }}
          />

          {/* Затемнение поверх фона */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90 z-0" />

          {/* ✅ Десктоп: отображать аватарку-кружок, если нет баннера */}
          {!artist.bannerUrl && artist.imageUrl && (
            <div className="hidden lg:block absolute bottom-10 left-10 z-10">
              <div className="w-40 h-40 rounded-full overflow-hidden shadow-2xl border-4 border-white/10">
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Контент: имя артиста и кнопки */}
          <div
            className={`
      relative z-10 h-full flex flex-col justify-end
      px-6 sm:px-10 pb-6 sm:pb-10
      ${!artist.bannerUrl && artist.imageUrl ? "lg:ml-56" : ""}
    `}
          >
            <p className="text-white text-sm font-semibold uppercase mb-2">
              Artist
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
                    ? "Pause"
                    : `Play all songs by ${artist.name}`
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
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Секция "Popular" - ручной рендеринг для кнопки "лайка" */}
        {popularSongs.length > 0 && (
          <div className="px-6 md:px-10 py-4">
            <h2 className="text-2xl font-bold text-white mb-4">Popular</h2>
            <div className="grid grid-cols-1 gap-4">
              {popularSongs.map((song, index) => {
                const isCurrentSong = currentSong?._id === song._id;
                return (
                  <div
                    key={song._id}
                    className="flex items-center md:px-4 gap-4 p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer "
                    onClick={() => handlePlaySpecificSong(song, index)}
                  >
                    <div className="flex items-center justify-center w-4">
                      {" "}
                      {/* Контейнер для номера/эквалайзера */}
                      {isCurrentSong && isPlaying ? (
                        <div className="z-10">
                          <Equalizer />
                        </div>
                      ) : (
                        <span className="group-hover:hidden">{index + 1}</span>
                      )}
                      {!isCurrentSong && (
                        <Play className="h-4 w-4 hidden group-hover:block" />
                      )}
                    </div>

                    <div className="w-12 h-12 flex-shrink-0">
                      <img
                        src={song.imageUrl || "/default-song-cover.png"}
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
                    {/* Отображение счетчика прослушиваний */}
                    <span className="text-zinc-400 text-sm ml-2 hidden sm:block">
                      {song.playCount?.toLocaleString() || 0} plays
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`hover:text-white ${
                        isSongLiked(song._id)
                          ? "text-violet-500"
                          : "text-zinc-400"
                      } w-8 h-8`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSongLike(song._id);
                      }}
                      title={
                        isSongLiked(song._id) ? "Unlike song" : "Like song"
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

        <div className="px-6 py-4">
          {/* Секция "Albums" */}
          {albums.length > 0 && (
            <AlbumGrid title="Albums" albums={albums} isLoading={loading} />
          )}

          {/* Секция "Singles and EPs" */}
          {singlesAndEps.length > 0 && (
            <AlbumGrid
              title="Singles and EPs"
              albums={singlesAndEps}
              isLoading={loading}
            />
          )}
        </div>

        {artist.bio && (
          <div className="px-6 py-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              About {artist.name}
            </h2>
            <p className="text-zinc-300 whitespace-pre-wrap">{artist.bio}</p>
          </div>
        )}
      </ScrollArea>
    </main>
  );
};

// Вспомогательная функция для форматирования времени
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default ArtistPage;
