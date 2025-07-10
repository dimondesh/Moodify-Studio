// src/components/SearchPage/PlaylistGrid.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Playlist } from "../../types"; // Убедитесь, что ваш types.ts содержит интерфейс Playlist
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton"; // Переименуйте или создайте скелетон, если AlbumGrid использует общий

type PlaylistGridProps = {
  title: string;
  playlists: Playlist[];
  isLoading: boolean;
};

const PlaylistGrid = ({ title, playlists, isLoading }: PlaylistGridProps) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <SectionGridSkeleton />; // Используем тот же скелетон, что и для альбомов/плейлистов

  const playlistsToShow = showAll ? playlists : playlists.slice(0, 4);

  return (
    <div className="mb-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>{" "}
        {/* Добавил text-white для контраста */}
        {playlists.length > 4 && (
          <Button
            variant="link"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : "Show all"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {playlistsToShow.map((playlist) => (
          <div
            key={playlist._id}
            className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all cursor-pointer"
            onClick={() => navigate(`/playlists/${playlist._id}`)} // Переход на страницу деталей плейлиста
          >
            <div className="relative mb-4">
              <div className=" aspect-square rounded-md shadow-lg overflow-hidden">
                <img
                  src={playlist.imageUrl || "/default_playlist_cover.png"} // Используем дефолтную обложку для плейлистов
                  alt={playlist.title}
                  className=" w-auto h-auto object-cover transition-transform duration-300 hover:scale-105" // object-cover для плейлистов
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/default_playlist_cover.png";
                  }}
                />
              </div>
            </div>
            <h3 className="font-medium mb-2 truncate text-white">
              {playlist.title}
            </h3>{" "}
            {/* Добавил text-white */}
            <p className="text-sm text-zinc-400 truncate">
              {playlist.owner?.fullName || "Unknown Artist"}{" "}
              {/* Отображаем владельца плейлиста */}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistGrid;
