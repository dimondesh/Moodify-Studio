// AlbumGrid.tsx
import { useState } from "react"; // useEffect и useMusicStore больше не нужны здесь
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Album, Artist } from "../../types"; // Импортируем Artist
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
// import { useMusicStore } from "../../stores/useMusicStore"; // Больше не нужен

type AlbumGridProps = {
  title: string;
  albums: Album[];
  isLoading: boolean;
};

const AlbumGrid = ({ title, albums, isLoading }: AlbumGridProps) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  // const { artists, fetchArtists } = useMusicStore(); // Больше не нужен
  // useEffect(() => { // Больше не нужен
  //   fetchArtists();
  // }, [fetchArtists]);

  // Вспомогательная функция для получения имен артистов
  // Теперь она ожидает массив объектов Artist, как определено в Song/Album type
  const getArtistNames = (artistsInput: Artist[] | undefined) => {
    if (!artistsInput || artistsInput.length === 0) {
      return "Unknown Artist";
    }

    const names = artistsInput
      .map((artist) => {
        // Проверяем, что это объект Artist и у него есть свойство name
        if (typeof artist === "object" && artist !== null && "name" in artist) {
          return artist.name;
        }
        return null; // Если по какой-то причине объект некорректен
      })
      .filter(Boolean); // Удаляем все null значения

    return names.join(", ") || "Unknown Artist";
  };

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
                  className="w-auto h-auto object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/default-album-cover.png";
                  }}
                />
              </div>
            </div>
            <h3 className="font-medium mb-2 truncate">{album.title}</h3>
            <p className="text-sm text-zinc-400 truncate">
              {/* Передаем album.artist напрямую, так как ожидается массив объектов Artist */}
              {getArtistNames(album.artist)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlbumGrid;
