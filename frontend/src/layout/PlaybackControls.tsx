// frontend/src/layout/PlaybackControls.tsx

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useLibraryStore } from "../stores/useLibraryStore";
import { Button } from "../components/ui/button";
import {
  Heart,
  Laptop2,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  ChevronDown,
  Maximize,
} from "lucide-react";
import { Slider } from "../components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogTitle,
} from "../components/ui/dialog";

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const PlaybackControls = () => {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    repeatMode,
    setRepeatMode,
    isShuffle,
    toggleShuffle,
    queue,
    currentIndex,
    playAlbum,
    isFullScreenPlayerOpen,
    setIsFullScreenPlayerOpen,
  } = usePlayerStore();

  const { isSongLiked, toggleSongLike, fetchLikedSongs } = useLibraryStore();

  const [volume, setVolume] = useState(75);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isCompactView, setIsCompactView] = useState(false);

  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  useEffect(() => {
    const checkScreenSize = () => {
      const isCompact = window.innerWidth < 1024;
      setIsCompactView(isCompact);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const toggleRepeatMode = () => {
    if (repeatMode === "off") {
      setRepeatMode("all");
    } else if (repeatMode === "all") {
      setRepeatMode("one");
    } else {
      setRepeatMode("off");
    }
  };

  useEffect(() => {
    audioRef.current = document.querySelector("audio");
    const audio = audioRef.current;
    if (!audio) {
      console.warn("Audio element not found!");
      return;
    }

    // Инициализируем источник аудио и громкость при изменении currentSong
    if (currentSong) {
      if (audio.src !== currentSong.audioUrl) {
        audio.src = currentSong.audioUrl;
        audio.load(); // Загружаем новое аудио
      }
      if (isPlaying) {
        audio.play().catch((e) => console.warn("Audio playback failed:", e));
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
      audio.src = ""; // Очищаем источник аудио, если нет текущей песни
    }

    audio.volume = volume / 100;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("canplaythrough", updateDuration); // Добавлен canplaythrough

    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else if (repeatMode === "all") {
        if (usePlayerStore.getState().isShuffle) {
          // Используем getState() для актуального состояния
          if (
            usePlayerStore.getState().shufflePointer ===
            usePlayerStore.getState().shuffleHistory.length - 1
          ) {
            playAlbum(
              usePlayerStore.getState().queue,
              usePlayerStore.getState().shuffleHistory[0]
            );
          } else {
            playNext();
          }
        } else if (
          usePlayerStore.getState().currentIndex !== null &&
          usePlayerStore.getState().currentIndex + 1 <
            usePlayerStore.getState().queue.length
        ) {
          playNext();
        } else {
          playAlbum(usePlayerStore.getState().queue, 0); // Начать альбом заново
        }
      } else {
        usePlayerStore.setState({ isPlaying: false });
      }
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("canplaythrough", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    currentSong,
    isPlaying,
    repeatMode,
    volume,
    queue,
    currentIndex,
    playNext,
    playAlbum,
  ]);

  // Отдельный useEffect для команд play/pause на основе состояния isPlaying
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.play().catch((e) => console.warn("Error playing audio:", e));
      } else {
        audio.pause();
      }
    }
  }, [isPlaying]);

  const [previousVolume, setPreviousVolume] = useState(75);

  const toggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
    } else {
      setVolume(previousVolume);
      if (audioRef.current) audioRef.current.volume = previousVolume / 100;
    }
  };

  const renderVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-4 w-4" />;
    if (volume <= 33) return <Volume className="h-4 w-4" />;
    if (volume <= 66) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
    }
  };

  const handleToggleLike = () => {
    if (currentSong) {
      toggleSongLike(currentSong._id);
    }
  };

  if (!currentSong) {
    return null;
  }

  // КОМПАКТНЫЙ ПЛЕЕР ДЛЯ МОБИЛЬНЫХ/ПЛАНШЕТОВ
  if (isCompactView) {
    return (
      <>
        {/* Аудио элемент находится здесь, чтобы он был частью компонента и всегда в DOM */}
        <audio id="player-audio-element" />

        {!isFullScreenPlayerOpen && (
          <footer className="fixed bottom-16 left-0 right-0 h-16 sm:h-20 bg-zinc-800 border-t border-zinc-700 px-3 sm:px-4 flex items-center justify-between z-[61]">
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
              onClick={() => setIsFullScreenPlayerOpen(true)}
            >
              <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                <img
                  src={currentSong.imageUrl || "/default-song-cover.png"}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute top-0 left-0 h-[2px] bg-white transition-all duration-100"
                  style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                />
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <div className="font-medium truncate text-white text-sm sm:text-base">
                  {currentSong.title}
                </div>
                <div className="text-xs text-zinc-400 truncate">
                  {currentSong.artist}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className={`hover:text-white ${
                  isSongLiked(currentSong._id)
                    ? "text-violet-500"
                    : "text-zinc-400"
                } w-8 h-8`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLike();
                }}
                title={
                  isSongLiked(currentSong._id) ? "Unlike song" : "Like song"
                }
              >
                <Heart className="h-5 w-5 fill-current" />
              </Button>
              <Button
                size="icon"
                className="bg-white hover:bg-white/90 text-black rounded-full h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="h-6 w-6 fill-current" />
                )}
              </Button>
            </div>
          </footer>
        )}

        {/* ПОЛНОЭКРАННЫЙ ПЛЕЕР (МОДАЛЬНОЕ ОКНО) */}
        <Dialog
          open={isFullScreenPlayerOpen}
          // ИСПРАВЛЕНО: Для shadcn/ui DialogContent, чтобы убрать кнопку "x",
          // нужно передать onOpenChange как undefined или сделать его условным.
          // Если вы используете shadcn/ui, это удалит стандартную кнопку закрытия.
          // Закрытие будет только через ChevronDown.
          onOpenChange={
            isFullScreenPlayerOpen ? setIsFullScreenPlayerOpen : undefined
          }
        >
          <DialogPortal>
            <DialogContent
              aria-describedby={undefined}
              // УБРАНО: aria-describedby={undefined}
              className="fixed inset-y-0 top-105 w-screen h-screen max-w-none rounded-none bg-zinc-950 text-white flex flex-col p-4 sm:p-6 min-w-screen overflow-hidden z-[70] border-0"
            >
              {/* DialogTitle для доступности (скрыт визуально) */}
              <DialogTitle className="sr-only">
                {currentSong?.title || "Now Playing"} -{" "}
                {currentSong?.artist || "Unknown Artist"}
              </DialogTitle>

              <div className="flex justify-between items-center w-full mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullScreenPlayerOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <ChevronDown className="h-6 w-6" />
                </Button>
                {/* Это уже отображаемый заголовок альбома/плейлиста, не DialogTitle для скринридеров */}
                <div className="text-sm font-semibold text-zinc-400 uppercase">
                  {currentSong?.albumTitle || "Now Playing"}
                </div>
                {/* ЭТА КНОПКА БЫЛА СДЕЛАНА НЕВИДИМОЙ ДЛЯ ВЫРАВНИВАНИЯ, ОСТАВЛЯЕМ ЕЕ */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white opacity-0 pointer-events-none"
                >
                  <Maximize className="h-6 w-6" />
                </Button>
              </div>

              <div className="flex-1 flex items-center justify-center px-4 py-8">
                {currentSong ? (
                  <img
                    src={currentSong.imageUrl || "/default-song-cover.png"}
                    alt={currentSong.title}
                    className="w-full max-w-md aspect-square object-cover rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="w-full max-w-md aspect-square bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500">
                    No song playing
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center w-full mb-4 px-2">
                <div className="flex flex-col text-left">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {currentSong?.title || "No song playing"}
                  </h2>
                  <p className="text-zinc-400 text-base">
                    {currentSong?.artist || "Unknown Artist"}
                  </p>
                </div>
                {currentSong && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`hover:text-white ${
                      isSongLiked(currentSong._id)
                        ? "text-violet-500"
                        : "text-zinc-400"
                    }`}
                    onClick={handleToggleLike}
                    title={
                      isSongLiked(currentSong._id) ? "Unlike song" : "Like song"
                    }
                  >
                    <Heart className="h-7 w-7 fill-current" />
                  </Button>
                )}
              </div>

              <div className="w-full flex items-center gap-2 mb-8 px-2">
                <div className="text-xs text-zinc-400">
                  {formatTime(currentTime)}
                </div>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  className="flex-1 hover:cursor-grab active:cursor-grabbing"
                  onValueChange={handleSeek}
                />
                <div className="text-xs text-zinc-400">
                  {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center justify-around w-full mb-8 px-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className={`hover:text-white ${
                    isShuffle ? "text-violet-500" : "text-zinc-400"
                  }`}
                  onClick={toggleShuffle}
                  title="Toggle Shuffle"
                >
                  <Shuffle className="h-6 w-6" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-white text-zinc-400"
                  onClick={() => {
                    if (!audioRef.current) return;
                    if (audioRef.current.currentTime > 3) {
                      audioRef.current.currentTime = 0;
                    } else {
                      playPrevious();
                    }
                  }}
                >
                  <SkipBack className="h-6 w-6 fill-current" />
                </Button>
                <Button
                  size="icon"
                  className="bg-violet-500 hover:bg-violet-400 text-black rounded-full h-16 w-16"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-9 w-9 fill-current" />
                  ) : (
                    <Play className="h-9 w-9 fill-current" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-white text-zinc-400"
                  onClick={playNext}
                >
                  <SkipForward className="h-6 w-6 fill-current" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`hover:text-white ${
                    repeatMode !== "off" ? "text-violet-500" : "text-zinc-400"
                  }`}
                  onClick={toggleRepeatMode}
                  title="Toggle Repeat Mode"
                >
                  {repeatMode === "one" ? (
                    <Repeat1 className="h-6 w-6" />
                  ) : (
                    <Repeat className="h-6 w-6" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between w-full pb-4 px-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-white text-zinc-400"
                >
                  <ListMusic className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:text-white text-zinc-400"
                    onClick={toggleMute}
                  >
                    {renderVolumeIcon()}
                  </Button>
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    className="w-24 hover:cursor-grab active:cursor-grabbing"
                    onValueChange={(value) => {
                      const newVolume = value[0];
                      setVolume(newVolume);
                      if (newVolume > 0) setPreviousVolume(newVolume);
                      if (audioRef.current) {
                        audioRef.current.volume = newVolume / 100;
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:text-white text-zinc-400"
                  >
                    <Laptop2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      </>
    );
  }

  // ДЕСКТОПНЫЙ ПЛЕЕР (ИЛИ ПЛЕЕР НА БОЛЬШИХ ЭКРАНАХ)
  return (
    <footer className="h-20 sm:h-24 bg-zinc-900 border-t border-zinc-800 px-4 z-40">
      {/* Аудио элемент находится здесь, чтобы он был частью компонента и всегда в DOM */}
      <audio id="player-audio-element" />

      <div className="flex justify-between items-center h-full max-w-[1800px] mx-auto">
        {/* ИСПРАВЛЕНО: Разделяем блок информации о песне и кнопку лайка */}
        <div className="flex items-center gap-4 min-w-[180px] w-[30%]">
          {currentSong && (
            <>
              <img
                src={currentSong.imageUrl || "/default-song-cover.png"}
                alt={currentSong.title}
                className="w-14 h-14 object-cover rounded-md"
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex flex-col">
                  <div className="font-medium truncate hover:underline cursor-pointer">
                    {currentSong.title}
                  </div>
                  <div className="text-sm text-zinc-400 truncate hover:underline cursor-pointer">
                    {currentSong.artist}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`hover:text-white ${
                    isSongLiked(currentSong._id)
                      ? "text-violet-500"
                      : "text-zinc-400"
                  }`}
                  onClick={handleToggleLike}
                  title={
                    isSongLiked(currentSong._id) ? "Unlike song" : "Like song"
                  }
                >
                  <Heart className="h-4 w-4 fill-current" />
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 max-w-full sm:max-w-[45%]">
          <div className="flex items-center gap-4 sm:gap-6">
            <Button
              size="icon"
              variant="ghost"
              className={`hover:text-white ${
                isShuffle ? "text-violet-500" : "text-zinc-400"
              }`}
              onClick={toggleShuffle}
              title="Toggle Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hover:text-white text-zinc-400"
              onClick={() => {
                if (!audioRef.current) return;
                if (audioRef.current.currentTime > 3) {
                  audioRef.current.currentTime = 0;
                } else {
                  playPrevious();
                }
              }}
              disabled={!currentSong}
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </Button>
            <Button
              size="icon"
              className="bg-white hover:bg-white/90 text-black rounded-full h-8 w-8"
              onClick={togglePlay}
              disabled={!currentSong}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hover:text-white text-zinc-400"
              onClick={playNext}
              disabled={!currentSong}
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`hover:text-white ${
                repeatMode !== "off" ? "text-violet-500" : "text-zinc-400"
              }`}
              onClick={toggleRepeatMode}
              title="Toggle Repeat Mode"
            >
              {repeatMode === "one" ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 w-full">
            <div className="text-xs text-zinc-400">
              {formatTime(currentTime)}
            </div>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              className="w-full hover:cursor-grab active:cursor-grabbing"
              onValueChange={handleSeek}
            />
            <div className="text-xs text-zinc-400">{formatTime(duration)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 min-w-[180px] w-[30%] justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="hover:text-white text-zinc-400"
          >
            <Mic2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:text-white text-zinc-400"
          >
            <ListMusic className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:text-white text-zinc-400"
          >
            <Laptop2 className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="hover:text-white text-zinc-400"
              onClick={toggleMute}
            >
              {renderVolumeIcon()}
            </Button>
            <Slider
              value={[volume]}
              max={100}
              step={1}
              className="w-24 hover:cursor-grab active:cursor-grabbing"
              onValueChange={(value) => {
                const newVolume = value[0];
                setVolume(newVolume);
                if (newVolume > 0) setPreviousVolume(newVolume);
                if (audioRef.current) {
                  audioRef.current.volume = newVolume / 100;
                }
              }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PlaybackControls;
