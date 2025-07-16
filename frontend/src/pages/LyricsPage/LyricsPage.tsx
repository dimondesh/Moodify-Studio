// frontend/src/components/LyricsPage.tsx

import { useEffect, useRef, useState, useCallback } from "react"; // Добавили useCallback
import { usePlayerStore } from "../../stores/usePlayerStore";
import { getArtistNames } from "@/lib/utils";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { ChevronDown } from "lucide-react";
import { useDominantColor } from "@/hooks/useDominantColor"; // ✅ импортируем твой хук

const parseLrc = (lrcContent: string): LyricLine[] => {
  const lines = lrcContent.split("\n");
  const parsedLyrics: LyricLine[] = [];

  lines.forEach((line) => {
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1], 10);
      const seconds = parseInt(timeMatch[2], 10);
      const milliseconds = parseInt(timeMatch[3].padEnd(3, "0"), 10);
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(/\[.*?\]/g, "").trim();
      parsedLyrics.push({ time: timeInSeconds, text });
    }
  });

  parsedLyrics.sort((a, b) => a.time - b.time);
  return parsedLyrics;
};

interface LyricLine {
  time: number;
  text: string;
}

interface LyricsPageProps {
  isMobileFullScreen?: boolean;
}

const LyricsPage: React.FC<LyricsPageProps> = ({
  isMobileFullScreen = false,
}) => {
  const {
    currentSong,
    currentTime,
    setIsDesktopLyricsOpen,
    setIsMobileLyricsFullScreen,
    setIsFullScreenPlayerOpen,
  } = usePlayerStore();

  const lyricsScrollAreaRef = useRef<HTMLDivElement>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { extractColor } = useDominantColor(); // ✅ берём функцию
  const dominantColor = usePlayerStore((state) => state.dominantColor); // ✅ читаем из стора
  const currentSongImage = currentSong?.imageUrl;

  useEffect(() => {
    if (currentSongImage) {
      extractColor(currentSong.imageUrl);
      console.log(extractColor);
    }
  }, [currentSong?.imageUrl, currentSongImage, extractColor]);
  // Обновление лирики при изменении песни
  useEffect(() => {
    if (currentSong?.lyrics) {
      setLyrics(parseLrc(currentSong.lyrics));
      // Сбрасываем скролл и состояние прокрутки при смене песни
      setIsUserScrolling(false);
      if (lyricsScrollAreaRef.current) {
        lyricsScrollAreaRef.current.scrollTop = 0;
      }
    } else {
      setLyrics([]);
    }
  }, [currentSong]);

  // Эффект для автопрокрутки
  useEffect(() => {
    // Выполняем автопрокрутку только если пользователь не прокручивает вручную
    if (lyricsScrollAreaRef.current && lyrics.length > 0 && !isUserScrolling) {
      const activeLineIndex = lyrics.findIndex(
        (line, index) =>
          currentTime >= line.time &&
          (index === lyrics.length - 1 || currentTime < lyrics[index + 1].time)
      );

      if (activeLineIndex !== -1) {
        const activeLineElement = lyricsScrollAreaRef.current.querySelector(
          `.lyric-line-${activeLineIndex}`
        );
        if (activeLineElement) {
          // Используем requestAnimationFrame для более плавной прокрутки
          requestAnimationFrame(() => {
            activeLineElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          });
        }
      }
    }
  }, [currentTime, lyrics, isUserScrolling]); // Добавили isUserScrolling в зависимости

  // Обработчик события прокрутки
  const handleScroll = useCallback(() => {
    // Если пользователь прокручивает, устанавливаем isUserScrolling в true
    if (!isUserScrolling) {
      setIsUserScrolling(true);
    }

    // Очищаем предыдущий таймаут, если он был
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Устанавливаем новый таймаут для сброса isUserScrolling
    // Если в течение 300мс нет нового скролла, считаем, что пользователь закончил
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
      scrollTimeoutRef.current = null;
    }, 300); // Можно настроить это значение
  }, [isUserScrolling]); // isUserScrolling - зависимость для useCallback

  // Добавляем слушатели событий скролла к ScrollArea
  useEffect(() => {
    const scrollAreaElement = lyricsScrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement; // Получаем сам viewport ScrollArea

    if (scrollAreaElement) {
      scrollAreaElement.addEventListener("scroll", handleScroll);
      // Добавляем слушатели для touch событий для мобильных устройств
      // Сбрасываем таймаут при начале тача, чтобы предотвратить автоскролл во время перетаскивания
      scrollAreaElement.addEventListener("touchstart", () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        setIsUserScrolling(true); // Сразу считаем, что пользователь начал прокрутку
      });
      // По завершении тача, запускаем таймаут для сброса isUserScrolling
      scrollAreaElement.addEventListener("touchend", () => {
        handleScroll(); // Вызываем handleScroll, чтобы установить таймаут
      });
      scrollAreaElement.addEventListener("touchcancel", () => {
        handleScroll();
      });
    }

    return () => {
      if (scrollAreaElement) {
        scrollAreaElement.removeEventListener("scroll", handleScroll);
        scrollAreaElement.removeEventListener("touchstart", () => {}); // Просто заглушки для remove
        scrollAreaElement.removeEventListener("touchend", () => {});
        scrollAreaElement.removeEventListener("touchcancel", () => {});
      }
      // Очищаем таймаут при размонтировании компонента
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]); // handleScroll - зависимость для useEffect

  const handleClose = () => {
    if (isMobileFullScreen) {
      setIsMobileLyricsFullScreen(false);
      setIsFullScreenPlayerOpen(true);
    } else {
      setIsDesktopLyricsOpen(false);
    }
  };

  if (!currentSong || !lyrics.length) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-screen text-zinc-400 ${
          isMobileFullScreen
            ? "fixed inset-0 z-[80] bg-zinc-950"
            : "w-full bg-black"
        }`}
      >
        <p>No lyrics available for this song.</p>
        <Button variant="ghost" className="mt-4" onClick={handleClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div
        className={`flex flex-col items-center justify-start h-[calc(100vh - 1px)] p-4 sm:p-8  text-white
      ${isMobileFullScreen ? "fixed inset-0 z-[80]" : "w-full"}`}
        style={{
          background: `linear-gradient(to bottom, ${dominantColor} 0%, rgba(20, 20, 20, 0.8) 50%, #18181b 100%)`,
        }}
      >
        <div className="flex justify-between items-center w-full max-w-4xl mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-zinc-400 hover:text-white"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
          <div className="text-sm font-semibold text-zinc-400 uppercase">
            Lyrics
          </div>
          <div className="w-10 h-10" />
        </div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-1">{currentSong.title}</h2>
          <p className="text-zinc-400 text-lg">
            {getArtistNames(currentSong.artist)}
          </p>
        </div>
        <ScrollArea
          className="flex-1 w-full max-w-4xl text-center h-full"
          ref={lyricsScrollAreaRef}
        >
          {lyrics.map((line, index) => (
            <p
              key={index}
              className={`py-1 text-2xl px-2 sm:text-3xl font-semibold transition-all duration-200 lyric-line-${index}
              ${
                currentTime >= line.time &&
                (index === lyrics.length - 1 ||
                  currentTime < lyrics[index + 1].time)
                  ? "text-violet-400 scale-105"
                  : "text-zinc-400"
              }`}
            >
              {line.text}
            </p>
          ))}
          <div className="h-[50vh] w-full"></div>{" "}
          {/* Добавим пустой div для прокрутки в конец */}
        </ScrollArea>
      </div>
    </div>
  );
};

export default LyricsPage;
