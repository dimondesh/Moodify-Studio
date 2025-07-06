import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Album } from "../../types";
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";

type AlbumGridProps = {
  title: string;
  albums: Album[];
  isLoading: boolean;
};

const AlbumGrid = ({ title, albums, isLoading }: AlbumGridProps) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <SectionGridSkeleton />;

  const albumsToShow = showAll ? albums : albums.slice(0, 4);

  return (
    <div className="mb-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {albums.length > 4 && (
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
        {albumsToShow.map((album) => (
          <div
            key={album._id}
            className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all cursor-pointer"
            onClick={() => navigate(`/albums/${album._id}`)}
          >
            <div className="relative mb-4">
              <div className="aspect-square rounded-md shadow-lg overflow-hidden">
                <img
                  src={album.imageUrl || "/default-album-cover.png"}
                  alt={album.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/default-album-cover.png";
                  }}
                />
              </div>
            </div>
            <h3 className="font-medium mb-2 truncate">{album.title}</h3>
            <p className="text-sm text-zinc-400 truncate">{album.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlbumGrid;
