// frontend/src/pages/LikedSongs.tsx

import { useEffect } from "react";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { usePlayerStore } from "../../stores/usePlayerStore"; // Для управления воспроизведением
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Clock, Heart, Pause, Play } from "lucide-react";
import Equalizer from "../../components/ui/equalizer";
import LibraryGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton"; // Для загрузки

// Вспомогательная функция для форматирования длительности, если ее нет в глобальных утилитах
export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const LikedSongsPage = () => {
  // Переименовал для ясности
  const { likedSongs, isLoading, error, fetchLikedSongs, toggleSongLike } =
    useLibraryStore();
  const { currentSong, isPlaying, playAlbum, togglePlay } = usePlayerStore(); // playAlbum может принимать массив песен и индекс

  useEffect(() => {
    fetchLikedSongs(); // Загружаем лайкнутые песни при монтировании
  }, [fetchLikedSongs]);

  if (isLoading) return <LibraryGridSkeleton />; // Скелетон загрузки

  // Если нет ошибок, но список пуст
  if (!isLoading && !error && likedSongs.length === 0) {
    return (
      <div className="p-6 bg-zinc-900 min-h-screen text-white">
        <h1 className="text-3xl mb-6 font-bold">Liked Songs</h1>
        <p className="text-zinc-400">
          No liked songs yet. Like some songs to see them here!
        </p>
      </div>
    );
  }

  // Если есть ошибка
  if (error) {
    return (
      <div className="p-6 bg-zinc-900 min-h-screen text-white">
        <h1 className="text-3xl mb-6 font-bold">Liked Songs</h1>
        <p className="text-red-500 mt-4 text-center">Error: {error}</p>
      </div>
    );
  }

  // Вычисляем общую длительность лайкнутых песен (если нужно)
  const totalDurationSeconds = likedSongs.reduce(
    (sum, song) => sum + (song.duration || 0),
    0
  );
  const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);

  // Определяем, играет ли текущая песня из списка лайкнутых
  const isAnyLikedSongPlaying = likedSongs.some(
    (song) => song._id === currentSong?._id
  );

  const handlePlayLikedSongs = () => {
    if (isAnyLikedSongPlaying) {
      togglePlay(); // Если уже играют лайкнутые, просто пауза/продолжить
    } else {
      // Иначе, начать воспроизведение всего списка лайкнутых песен с первой
      playAlbum(likedSongs, 0);
    }
  };

  const handlePlaySpecificSong = (index: number) => {
    playAlbum(likedSongs, index);
  };

  return (
    <div className="h-full ">
      <ScrollArea className="h-full rounded-md">
        <div className="relative min-h-screen">
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#5038a0]/80 via-zinc-900/80
      to-zinc-900 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10">
            {/* Верхний баннер */}
            <div className="flex p-6 gap-6 pb-8">
              {/* Обложка (можно использовать заглушку или иконку сердца) */}
              <img
                src="/liked.png" // 💡 Используем заглушку или создадим кастомную картинку
                alt="Liked Songs"
                className="w-[240px] h-[240px] shadow-xl rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/default-song-cover.png"; // Fallback
                }}
              />
              <div className="flex flex-col justify-end">
                <p className="text-sm font-medium ">Playlist</p>
                <h1 className="text-7xl font-bold my-4">Liked Songs</h1>
                <div className="flex items-center gap-2 text-sm text-zinc-100">
                  <span className="font-medium text-white">Your Library</span>
                  <span>
                    • {likedSongs.length}{" "}
                    {likedSongs.length !== 1 ? "songs" : "song"}
                  </span>
                  {totalDurationMinutes > 0 && (
                    <span>• {totalDurationMinutes} min</span>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопки управления (Play All, Like/Unlike All - пока только Play All) */}
            <div className="px-6 pb-4 flex items-center gap-6 ">
              <Button
                onClick={handlePlayLikedSongs}
                size="icon"
                className="w-14 h-14 rounded-full bg-violet-500 hover:bg-violet-400
                hover:scale-105 transition-all"
              >
                {isPlaying && isAnyLikedSongPlaying ? (
                  <Pause className="w-8 h-8 text-black fill-current" />
                ) : (
                  <Play className="w-8 h-8 text-black fill-current" />
                )}
              </Button>
              {/* Можно добавить кнопку "Like All / Unlike All" здесь позже, если нужно */}
            </div>

            {/* Table Section */}
            <div className="bg-black/20 backdrop-blur-sm">
              {/* table header */}
              <div
                className="grid grid-cols-[16px_4fr_2fr_1fr_min-content] gap-4 px-10 py-2 text-sm
            text-zinc-400 border-b border-white/5" // Добавлен min-content для кнопки лайка
              >
                <div>#</div>
                <div>Title</div>
                <div>Liked Date</div> {/* Изменил на Liked Date */}
                <div>
                  <Clock className="h-4 w-4" />
                </div>
                <div></div> {/* Пустой заголовок для кнопки лайка */}
              </div>

              {/* songs list */}
              <div className="px-6">
                <div className="space-y-2 py-4">
                  {likedSongs.map((song, index) => {
                    const isThisSongPlaying = currentSong?._id === song._id;
                    return (
                      <div
                        key={song._id}
                        onClick={() => handlePlaySpecificSong(index)}
                        className={`grid grid-cols-[16px_4fr_2fr_1fr_min-content] gap-4 px-4 py-2 text-sm
                      text-zinc-400 hover:bg-white/5 rounded-md group cursor-pointer
                      ${isThisSongPlaying ? "bg-white/10" : ""}`} // Подсветка текущей играющей песни
                      >
                        <div className="flex items-center justify-center">
                          {isThisSongPlaying && isPlaying ? (
                            <div className="z-10">
                              <Equalizer />
                            </div>
                          ) : (
                            <span className="group-hover:hidden">
                              {index + 1}
                            </span>
                          )}

                          {!isThisSongPlaying && (
                            <Play className="h-4 w-4 hidden group-hover:block text-white" />
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={song.imageUrl || "/default-song-cover.png"}
                            alt={song.title}
                            className="size-10 object-cover rounded-md"
                          />

                          <div>
                            <div
                              className={`font-medium ${
                                isThisSongPlaying
                                  ? "text-violet-400"
                                  : "text-white"
                              }`}
                            >
                              {song.title}
                            </div>
                            <div>{song.artist}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {song.likedAt
                            ? new Date(song.likedAt).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div className="flex items-center">
                          {formatDuration(song.duration)}
                        </div>
                        {/* Кнопка "Дизлайк" (Heart) */}
                        <div className="flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation(); // Важно, чтобы не срабатывал handlePlaySpecificSong
                              toggleSongLike(song._id);
                            }}
                            title="Unlike song"
                          >
                            <Heart className="h-5 w-5 fill-current" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LikedSongsPage; // Экспортируем как LikedSongsPage
