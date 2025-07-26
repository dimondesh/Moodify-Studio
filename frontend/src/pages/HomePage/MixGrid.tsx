import type { Mix } from "@/types";
import { useNavigate } from "react-router-dom";
import SectionGridSkeleton from "./SectionGridSkeleton";
import { Button } from "@/components/ui/button"; // <-- Импортируем компонент кнопки

interface MixGridProps {
  title: string;
  mixes: Mix[];
  isLoading: boolean;
}

const MixGrid = ({ title, mixes, isLoading }: MixGridProps) => {
  const navigate = useNavigate();
  const mixesToShow = mixes.slice(0, 4);

  if (isLoading) {
    return <SectionGridSkeleton />;
  }

  if (!mixes || mixes.length === 0) {
    return null;
  }

  // Навигация на страницу со всеми миксами категории
  const handleShowAll = () => {
    navigate(`/all-mixes/${encodeURIComponent(title)}`, {
      state: {
        mixes: mixes, // Передаем ВЕСЬ массив миксов
        title: title,
      },
    });
  };

  const handleNavigateToMix = (mix: Mix) => {
    navigate(`/mixes/${mix._id}`);
  };

  return (
    <div className="mb-8">
      {/* Обертка для заголовка и кнопки */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {/* Кнопка "Show all" появляется, только если миксов больше 4 */}
        {mixes.length > 4 && (
          <Button
            variant="link"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={handleShowAll}
          >
            Show all
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mixesToShow.map((mix) => (
          <div
            key={mix._id}
            onClick={() => handleNavigateToMix(mix)}
            className="group relative cursor-pointer overflow-hidden rounded-md bg-zinc-800/60 hover:bg-zinc-700/80 transition-all"
          >
            <img
              src={mix.imageUrl}
              alt={mix.name}
              className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-start justify-start p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
              <h3 className="text-white text-2xl font-bold drop-shadow-lg break-words">
                {mix.name}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MixGrid;
