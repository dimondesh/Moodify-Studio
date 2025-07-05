import { useNavigate } from "react-router-dom";
import FeaturedGridSkeleton from "../../components/ui/skeletons/FeaturedGridSkeleton";
import { useMusicStore } from "../../stores/useMusicStore";
import PlayButton from "./PlayButton";

const FeaturedSection = () => {
  const { isLoading, featuredSongs, error } = useMusicStore();
  const navigate = useNavigate();

  if (isLoading) return <FeaturedGridSkeleton />;

  if (error) return <p className="text-red-500 mb-4 text-lg">{error}</p>;

  // Добавляем проверку на массив и fallback
  const songsArray = Array.isArray(featuredSongs) ? featuredSongs : [];

  const handleClick = (albumId: string | null) => {
    if (albumId) {
      navigate(`/albums/${albumId}`);
    } else {
      console.warn("albumId отсутствует");
    }
  };

  if (songsArray.length === 0) {
    return <p className="text-zinc-400">Нет рекомендуемых песен</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {songsArray.map((song) => (
        <div
          key={song._id}
          className="flex items-center bg-zinc-800/50 rounded-md overflow-hidden hover:bg-zinc-700/50
             transition-colors group cursor-pointer relative"
          onClick={() => handleClick(song.albumId)}
        >
          <img
            src={song.imageUrl || "/default-song-cover.png"}
            alt={song.title}
            className="w-16 sm:w-20 h-16 sm:h-20 object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-song-cover.png";
            }}
          />
          <div className="flex-1 p-4">
            <p className="font-md truncate">{song.title || "Без названия"}</p>
            <p className="font-sm text-zinc-400 truncate">
              {song.artist || "Неизвестный исполнитель"}
            </p>
          </div>
          <PlayButton song={song} />
        </div>
      ))}
    </div>
  );
};

export default FeaturedSection;
