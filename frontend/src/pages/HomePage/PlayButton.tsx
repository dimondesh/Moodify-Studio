import { Pause, Play } from "lucide-react";
import { Button } from "../../components/ui/button";
import { usePlayerStore } from "../../stores/usePlayerStore";
import type { Song } from "../../types";

type PlayButtonProps = {
  song: Song;
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
};

const PlayButton = ({ song, onClick }: PlayButtonProps) => {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } =
    usePlayerStore();
  const isCurrentSong = currentSong?._id === song._id;

  const handlePlay = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation(); // Остановить всплытие, чтобы клик не вызывал переход по карточке
    if (onClick) onClick(e); // Если есть кастомный onClick — вызвать его

    if (isCurrentSong) togglePlay();
    else setCurrentSong(song);
  };

  return (
    <Button
      size={"icon"}
      onClick={handlePlay}
      className={`absolute bottom-3 right-2 bg-violet-500 hover:bg-violet-400 hover:scale-105 transition-all 
        opacity-0 translate-y-2 group-hover:translate-y-0 ${
          isCurrentSong ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
    >
      {isCurrentSong && isPlaying ? (
        <Pause className="size-5 text-black fill-current" />
      ) : (
        <Play className="size-5 text-black fill-current" />
      )}
    </Button>
  );
};

export default PlayButton;
