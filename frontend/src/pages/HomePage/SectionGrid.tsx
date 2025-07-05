import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Song } from "../../types";
import PlayButton from "./PlayButton";
import SectionGridSkeleton from "./SectionGridSkeleton";

type SectionGridProps = {
  title: string;
  songs: Song[] | null | undefined;
  isLoading: boolean;
  showAllPath?: string;
};

const SectionGrid = ({
  title,
  songs,
  isLoading,
  showAllPath,
}: SectionGridProps) => {
  const navigate = useNavigate();

  if (isLoading) return <SectionGridSkeleton />;

  // Защитная проверка и преобразование в массив
  const safeSongs = Array.isArray(songs) ? songs : [];
  const songsToShow = safeSongs.slice(0, 4);

  if (safeSongs.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">{title}</h2>
        <p className="text-zinc-400">Нет доступных песен</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {safeSongs.length > 4 && showAllPath && (
          <Button
            variant="link"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => navigate(showAllPath)}
          >
            Show all
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {songsToShow.map((song) => (
          <div
            key={song._id}
            className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
            onClick={() => {
              if (song.albumId) {
                const albumIdStr = String(song.albumId);
                if (albumIdStr.length > 0) {
                  navigate(`/albums/${albumIdStr}`);
                  return;
                }
              }
              console.warn("albumId отсутствует или не строка:", song.albumId);
            }}
          >
            <div className="relative mb-4">
              <div className="aspect-square rounded-md shadow-lg overflow-hidden">
                <img
                  src={song.imageUrl || "/default-song-cover.png"}
                  alt={song.title || "Без названия"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/default-song-cover.png";
                  }}
                />
              </div>
              <PlayButton song={song} />
            </div>
            <h3 className="font-medium mb-2 truncate">
              {song.title || "Без названия"}
            </h3>
            <p className="text-sm text-zinc-400 truncate">
              {song.artist || "Неизвестный исполнитель"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionGrid;
