// frontend/src/pages/AllSongsPage.tsx
import { JSX, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PlayButton from "../../pages/HomePage/PlayButton";
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
import type { Song } from "../../types/index";
import axios from "axios";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";
import { useMusicStore } from "../../stores/useMusicStore";
import React from "react"; // Добавил импорт React

interface Artist {
  _id: string;
  name: string;
}

const AllSongsPage = () => {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const initialSongs = location.state?.songs;
  const pageTitle = location.state?.title || "Все песни";
  const apiEndpoint = location.state?.apiEndpoint;

  const { artists, fetchArtists } = useMusicStore();

  useEffect(() => {
    if (initialSongs && initialSongs.length > 0) {
      setSongs(initialSongs);
      setIsLoading(false);
    } else if (apiEndpoint) {
      const fetchSongs = async () => {
        try {
          const response = await axios.get(apiEndpoint, {
            withCredentials: true,
          });
          const fetchedData = response.data.songs || response.data.albums;
          if (Array.isArray(fetchedData)) {
            setSongs(fetchedData);
          } else {
            console.error("Fetched data is not an array:", fetchedData);
            setError("Некорректный формат данных.");
          }
        } catch (err) {
          console.error("Ошибка при загрузке всех песен:", err);
          setError("Не удалось загрузить песни.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchSongs();
    } else {
      setIsLoading(false);
      setError("Нет доступных данных для отображения.");
    }
    fetchArtists();
  }, [initialSongs, apiEndpoint, fetchArtists]);

  // Восстановленная и модифицированная вспомогательная функция getArtistNamesDisplay
  const getArtistNamesDisplay = (
    artistsInput: (string | Artist)[] | undefined
  ) => {
    if (!artistsInput || artistsInput.length === 0) {
      return <span>Unknown artist</span>;
    }

    const artistElements: JSX.Element[] = [];
    artistsInput.forEach((artistOrId, index) => {
      let artistName: string | null = null;
      let artistId: string | null = null;

      if (typeof artistOrId === "string") {
        const foundArtist = artists.find((a: Artist) => a._id === artistOrId);
        if (foundArtist) {
          artistName = foundArtist.name;
          artistId = foundArtist._id;
        }
      } else {
        artistName = artistOrId.name;
        artistId = artistOrId._id;
      }

      if (artistName && artistId) {
        artistElements.push(
          <span key={artistId}>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Предотвратить переход по альбому при клике на артиста
                handleNavigateToArtist(artistId);
              }}
              className="hover:underline focus:outline-none focus:underline"
            >
              {artistName}
            </button>
            {index < artistsInput.length - 1 && ", "}
          </span>
        );
      }
    });

    return <>{artistElements}</>;
  };

  const handleNavigateToAlbum = (
    e: React.MouseEvent, // Используем React.MouseEvent
    albumId: string | null | undefined
  ) => {
    e.stopPropagation(); // Остановить распространение события, чтобы избежать двойного перехода
    if (albumId) {
      const albumIdStr = String(albumId);
      if (albumIdStr.length > 0) {
        navigate(`/albums/${albumIdStr}`);
      }
    } else {
      console.warn("albumId отсутствует или не строка:", albumId);
    }
  };

  const handleNavigateToArtist = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  if (isLoading) return <SectionGridSkeleton />;
  if (error) return <div className="p-4 text-red-500">Ошибка: {error}</div>;
  if (!songs || songs.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{pageTitle}</h2>
        <p className="text-zinc-400">Нет доступных песен в этой категории.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-190px)] w-full rounded-md pr-4">
      <div className="p-4 pt-0">
        <h2 className="text-2xl font-bold mb-6">{pageTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {songs.map((song) => (
            <div
              key={song._id}
              className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
              onClick={() => {
                // Основной клик по карточке, ведущий на альбом
                if (song.albumId) {
                  const albumIdStr = String(song.albumId);

                  if (albumIdStr.length > 0) {
                    navigate(`/albums/${albumIdStr}`);
                    return;
                  }
                }
                console.warn(
                  "albumId отсутствует или не строка:",
                  song.albumId
                );
              }}
            >
              <div className="relative mb-4">
                <div className="aspect-square rounded-md shadow-lg overflow-hidden">
                  {/* Обложка альбома теперь кликабельна */}
                  <button
                    onClick={(e) => handleNavigateToAlbum(e, song.albumId)}
                    className="w-full h-full block"
                  >
                    <img
                      src={song.imageUrl || "/default-song-cover.png"}
                      alt={song.title || "No title"}
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/default-song-cover.png";
                      }}
                    />
                  </button>
                </div>
                <PlayButton song={song} />
              </div>
              {/* Название песни теперь кликабельно */}
              <h3 className="font-medium mb-2 truncate">
                <button
                  onClick={(e) => handleNavigateToAlbum(e, song.albumId)}
                  className="hover:underline focus:outline-none focus:underline text-left w-full"
                >
                  {song.title || "No title"}
                </button>
              </h3>
              <p className="text-sm text-zinc-400 truncate">
                {/* Имена артистов теперь кликабельны */}
                {getArtistNamesDisplay(song.artist)}{" "}
              </p>
            </div>
          ))}
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};

export default AllSongsPage;
