// frontend/src/components/DynamicTitleUpdater.tsx

import { useEffect } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { getArtistNames } from "../lib/utils"; // Импортируем ВАШУ функцию из utils

const DynamicTitleUpdater = () => {
  const {
    currentSong,
    isPlaying,
    isDesktopLyricsOpen,
    isMobileLyricsFullScreen,
  } = usePlayerStore();

  useEffect(() => {
    const isLyricsOpen = isDesktopLyricsOpen || isMobileLyricsFullScreen;

    if (currentSong) {
      // Используем ВАШУ существующую функцию getArtistNames.
      // Так как currentSong.artist это уже массив объектов Artist,
      // нам не нужно передавать второй аргумент (allArtists).
      const artistName = getArtistNames(currentSong.artist);

      if (isLyricsOpen) {
        // Приоритет №1: Открыт текст песни
        document.title = `Lyrics: ${currentSong.title} by ${artistName} | Moodify`;
      } else if (isPlaying) {
        // Приоритет №2: Песня играет
        document.title = `${currentSong.title} • ${artistName}`;
      }
      // Если песня на паузе, заголовок не меняется, позволяя заголовку со страницы оставаться активным.
    }
  }, [currentSong, isPlaying, isDesktopLyricsOpen, isMobileLyricsFullScreen]);

  // Этот компонент не рендерит HTML, он только выполняет побочный эффект (изменение заголовка).
  return null;
};

export default DynamicTitleUpdater;
