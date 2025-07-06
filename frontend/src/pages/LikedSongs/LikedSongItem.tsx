// frontend/src/components/LikedSongItem.tsx

import React from "react";
import { Link } from "react-router-dom";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useLibraryStore } from "../../stores/useLibraryStore"; // Для кнопки лайка
import type { Song } from "../../types"; // Твой тип Song
import { Play, Pause, Heart } from "lucide-react"; // Иконки
import { Button } from "../../components/ui/button"; // Используй Button из твоих ui/components

interface LikedSongItemProps {
  song: Song;
}

const LikedSongItem: React.FC<LikedSongItemProps> = ({ song }) => {
  const { currentSong, isPlaying, playSong, pauseSong } = usePlayerStore();
  const { toggleSongLike } = useLibraryStore(); // Для удаления из лайкнутых

  const isCurrentPlaying = currentSong?._id === song._id && isPlaying;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем срабатывание Link
    if (isCurrentPlaying) {
      pauseSong();
    } else {
      playSong(song);
    }
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем срабатывание Link
    toggleSongLike(song._id);
    // После дизлайка, `useLibraryStore` сам перезагрузит список
  };

  return (
    <div
      key={song._id}
      className="flex items-center bg-zinc-800/50 rounded-md overflow-hidden hover:bg-zinc-700/50
         transition-colors group relative p-2" // Добавил p-2 для внутренних отступов
    >
      <Link
        to={`/songs/${song._id}`}
        className="flex items-center gap-4 flex-grow"
      >
        {" "}
        {/* Обернул основную часть в Link */}
        <img
          src={song.imageUrl || "/default-song-cover.png"}
          alt={song.title}
          className="w-16 h-16 object-cover flex-shrink-0 rounded-md" // Сделал обложку круглой, если нравится
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/default-song-cover.png";
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-md truncate text-white">
            {song.title || "Без названия"}
          </p>
          <p className="font-sm text-zinc-400 truncate">
            {song.artist || "Неизвестный исполнитель"}
          </p>
        </div>
      </Link>

      {/* Кнопка Воспроизведения */}
      <Button
        size="icon"
        className="ml-auto mr-2 p-0 bg-white hover:bg-white/80 text-black rounded-full h-8 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handlePlayPause}
      >
        {isCurrentPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
      </Button>

      {/* Кнопка "Дизлайк" (Heart) */}
      <Button
        size="icon"
        variant="ghost"
        className="text-red-500 ml-2 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleToggleLike}
        title="Unlike song"
      >
        <Heart className="h-5 w-5 fill-current" />{" "}
        {/* Всегда красная, т.к. это лайкнутая песня */}
      </Button>
    </div>
  );
};

export default LikedSongItem;
