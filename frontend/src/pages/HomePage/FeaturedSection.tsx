import { useNavigate } from "react-router-dom";
import FeaturedGridSkeleton from "../../components/ui/skeletons/FeaturedGridSkeleton";
import { useMusicStore } from "../../stores/useMusicStore";
import PlayButton from "./PlayButton";
import { JSX, useEffect } from "react";
import React from "react"; // Добавил импорт React

interface Artist {
  _id: string;
  name: string;
}

const FeaturedSection = () => {
  const { isLoading, featuredSongs, error, artists, fetchArtists } =
    useMusicStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  // Новая функция для отображения кликабельных имен артистов
  const getArtistNamesDisplay = (
    artistsInput: (string | Artist)[] | undefined
  ) => {
    if (!artistsInput || artistsInput.length === 0) {
      return <span>Неизвестный исполнитель</span>;
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

  if (isLoading) return <FeaturedGridSkeleton />;

  if (error) return <p className="text-red-500 mb-4 text-lg">{error}</p>;

  const songsArray = Array.isArray(featuredSongs) ? featuredSongs : [];

  const handleNavigateToAlbum = (
    e: React.MouseEvent, // Используем React.MouseEvent
    albumId: string | null | undefined
  ) => {
    e.stopPropagation(); // Остановить распространение события, чтобы избежать двойного перехода
    if (albumId) {
      navigate(`/albums/${albumId}`);
    } else {
      console.warn("albumId отсутствует");
    }
  };

  const handleNavigateToArtist = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  if (songsArray.length === 0) {
    return <p className="text-zinc-400">No songs available</p>;
  }

  return (
    <div className="grid grid-cols-2  sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {songsArray.map((song) => (
        <div
          key={song._id}
          className="flex items-cengridter bg-zinc-800/50 rounded-sm sm:rounded-md overflow-hidden hover:bg-zinc-700/50
             transition-colors group cursor-pointer relative "
          onClick={() => {
            // Основной клик по карточке, ведущий на альбом
            handleNavigateToAlbum(
              new MouseEvent("click") as unknown as React.MouseEvent,
              song.albumId
            );
          }}
        >
          {/* Обложка альбома теперь кликабельна */}
          <button
            onClick={(e) => handleNavigateToAlbum(e, song.albumId)}
            className="flex-shrink-0"
          >
            <img
              src={song.imageUrl || "/default-song-cover.png"}
              alt={song.title}
              className="w-10 sm:w-20 h-10 sm:h-20 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-song-cover.png";
              }}
            />
          </button>
          <div className="flex-1 p-2 sm:p-4">
            {/* Название песни теперь кликабельно */}
            <p className="font-md truncate">
              <button
                onClick={(e) => handleNavigateToAlbum(e, song.albumId)}
                className="hover:underline focus:outline-none focus:underline text-left w-full"
              >
                {song.title || "Без названия"}
              </button>
            </p>
            <p className="hidden sm:inline font-sm text-zinc-400 truncate">
              {/* Имена артистов теперь кликабельны */}
              {getArtistNamesDisplay(song.artist)}
            </p>
          </div>
          <PlayButton song={song} />
        </div>
      ))}
    </div>
  );
};

export default FeaturedSection;
