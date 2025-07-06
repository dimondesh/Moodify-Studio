import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Song } from "../../types";
import PlayButton from "./PlayButton";
import SectionGridSkeleton from "./SectionGridSkeleton";

type SectionGridProps = {
  title: string;
  songs: Song[] | null | undefined;
  isLoading: boolean;
  apiEndpoint?: string;
  showAllPath: string;
};

const SectionGrid = ({
  title,
  songs,
  isLoading,
  apiEndpoint,
}: SectionGridProps) => {
  const navigate = useNavigate();

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
                  alt={song.title || "No title"}
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
              {song.title || "No title"}
            </h3>
            <p className="text-sm text-zinc-400 truncate">
              {song.artist || "Unknown artist"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionGrid;
