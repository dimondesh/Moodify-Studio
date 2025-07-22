import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Song } from "../../types";
import PlayButton from "./PlayButton";
import SectionGridSkeleton from "./SectionGridSkeleton";
import { useMusicStore } from "../../stores/useMusicStore";
import { JSX, useEffect } from "react";
import React from "react"; // Добавил импорт React

interface Artist {
  _id: string;
  name: string;
}

type SectionGridProps = {
  title: string;
  songs: Song[] | null | undefined;
  isLoading: boolean;
  apiEndpoint?: string;
  showAllPath?: string;
};

const SectionGrid = ({
  title,
  songs,
  isLoading,
  apiEndpoint,
}: SectionGridProps) => {
  const navigate = useNavigate();
  const { artists, fetchArtists } = useMusicStore();

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  // Новая функция для отображения кликабельных имен артистов
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

  const safeSongs = Array.isArray(songs) ? songs : [];
  const songsToShow = safeSongs.slice(0, 4);

  if (safeSongs.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">{title}</h2>
        <p className="text-zinc-400">No Songs Available</p>
      </div>
    );
  }

  const handleShowAll = () => {
    navigate(`/all-songs/${encodeURIComponent(title)}`, {
      state: {
        songs: safeSongs,
        title: title,
        apiEndpoint: apiEndpoint,
      },
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 ">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {safeSongs.length > 4 && (
          <Button
            variant="link"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={handleShowAll}
          >
            Show all
          </Button>
        )}
      </div>
      <div className=" grid  grid-cols-2 grid-rows-1 sm:grid-cols-2  lg:grid-cols-4 gap-4 ">
        {songsToShow.map((song) => (
          <div
            key={song._id}
            className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
            onClick={() => {
              // Основной клик по карточке, ведущий на альбом
              if (song.albumId) {
                const albumIdStr = String(song.albumId);
                if (albumIdStr.length > 0) {
                  navigate(`/albums/${albumIdStr}`);
                }
              } else {
                console.warn(
                  "albumId отсутствует или не строка:",
                  song.albumId
                );
              }
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
                    className="w-auto h-auto object-cover transition-transform duration-300 group-hover:scale-105"
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
              {getArtistNamesDisplay(song.artist)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionGrid;
