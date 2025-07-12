import React, { useState } from "react"; // Добавьте import React
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Artist } from "../../types"; // Убедитесь, что ваш types.ts содержит интерфейс Artist
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton"; // Общий скелетон

type ArtistGridProps = {
  title: string;
  artists: Artist[];
  isLoading: boolean;
};

// Явно указываем React.FC для типизации компонента
const ArtistGrid: React.FC<ArtistGridProps> = ({
  title,
  artists,
  isLoading,
}) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <SectionGridSkeleton />;

  const artistsToShow = showAll ? artists : artists.slice(0, 4);

  return (
    <div className="mb-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        {artists.length > 4 && (
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
        {artistsToShow.map((artist) => (
          <div
            key={artist._id}
            className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
            onClick={() => navigate(`/artists/${artist._id}`)} // Переход на страницу деталей артиста
          >
            <div className="relative mb-4">
              <div className="aspect-square rounded-full shadow-lg overflow-hidden">
                {" "}
                {/* Rounded for artists */}
                <img
                  src={artist.imageUrl || "/default_artist_cover.png"} // Дефолтная обложка для артистов
                  alt={artist.name}
                  className="w-auto h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/default_artist_cover.png";
                  }}
                />
              </div>
            </div>
            <h3 className="font-medium mb-2 truncate text-white text-center">
              {artist.name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtistGrid;
