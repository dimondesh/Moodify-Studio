// frontend/src/pages/ArtistPage/ArtistPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import AlbumGrid from "../SearchPage/AlbumGrid";
import { Play, Heart, MoreHorizontal } from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useLibraryStore } from "../../stores/useLibraryStore";

// Импортируем типы из центрального файла типов
import type { Artist, Song, Album } from "../../types";
import { axiosInstance } from "@/lib/axios";

const ArtistPage = () => {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { playAlbum } = usePlayerStore();
  const { isSongLiked, toggleSongLike, fetchLikedSongs } = useLibraryStore();

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
  }, [id, fetchLikedSongs]);

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

  const popularSongs = [...allArtistSongs].slice(0, 5);

  const albums = allArtistAlbums.filter((album) => album.type === "Album");
  const singlesAndEps = allArtistAlbums.filter(
    (album) => album.type === "Single" || album.type === "EP"
  );

  const handlePlayArtistSongs = () => {
    if (allArtistSongs.length > 0) {
      playAlbum(allArtistSongs, 0);
    }
  };

  // Вспомогательная функция для безопасного извлечения имен артистов
  const getArtistNames = (
    artistData: (Artist | string)[] | undefined
  ): string => {
    if (!artistData || artistData.length === 0) {
      return "Unknown Artist";
    }
    return artistData
      .map((item) => {
        // Проверяем, является ли элемент объектом и имеет ли свойство 'name'
        if (typeof item === "object" && item !== null && "name" in item) {
          return item.name;
        }
        // Если это строка (ID) или объект без 'name', возвращаем строковое представление
        return String(item);
      })
      .join(", ");
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-violet-900/50 to-zinc-950">
      <ScrollArea className="h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-170px)] w-full pb-20 md:pb-0">
        {/* Шапка артиста */}
        <div className="px-6 relative p-4 sm:p-6 pb-24  flex items-end gap-6 bg-gradient-to-t from-zinc-900 to-transparent">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex-shrink-0">
            <img
              src={artist.imageUrl || "/default-artist-cover.png"}
              alt={artist.name}
              className="w-full h-full object-cover rounded-full shadow-2xl"
            />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-sm font-bold text-white mb-2">Artist</p>
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight">
              {artist.name}
            </h1>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="px-6 py-4 flex items-center gap-4">
          <Button
            className="bg-violet-500 hover:bg-violet-600 text-black rounded-full h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center transition-transform hover:scale-105"
            onClick={handlePlayArtistSongs}
            title={`Play all songs by ${artist.name}`}
          >
            <Play className="h-7 w-7 fill-current" />
          </Button>
          <Button
            variant="outline"
            className="rounded-full px-4 py-2 text-white border-zinc-500 hover:border-white hover:text-white"
          >
            Follow
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-zinc-400 hover:text-white"
          >
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>

        {/* Секция "Popular" - ручной рендеринг для кнопки "лайка" */}
        {popularSongs.length > 0 && (
          <div className="px-6 py-4">
            <h2 className="text-2xl font-bold text-white mb-4">Popular</h2>
            <div className="grid grid-cols-1 gap-4">
              {popularSongs.map((song, index) => (
                <div
                  key={song._id}
                  className="flex items-center gap-4 p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer"
                  onClick={() =>
                    playAlbum(
                      allArtistSongs,
                      allArtistSongs.findIndex((s) => s._id === song._id)
                    )
                  }
                >
                  <span className="text-zinc-400 w-4 text-center">
                    {index + 1}
                  </span>
                  <div className="w-12 h-12 flex-shrink-0">
                    <img
                      src={song.imageUrl || "/default-song-cover.png"}
                      alt={song.title}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {song.title}
                    </p>
                    {/* Используем вспомогательную функцию для получения имен артистов */}
                    <p className="text-zinc-400 text-sm truncate">
                      {getArtistNames(song.artist)}
                    </p>
                  </div>
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
                    title={isSongLiked(song._id) ? "Unlike song" : "Like song"}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                  <span className="text-zinc-400 text-sm ml-2">
                    {formatTime(song.duration)}
                  </span>
                </div>
              ))}
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

        {/* Можно добавить секцию "About" или "Bio" если у артиста есть поле bio */}
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
