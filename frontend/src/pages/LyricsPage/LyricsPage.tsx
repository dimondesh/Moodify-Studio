// frontend/src/pages/LyricsPage/LyricsPage.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { getArtistNames } from "@/lib/utils";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { ChevronDown } from "lucide-react";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const {
    currentSong,
    currentTime,
    setIsDesktopLyricsOpen,
    setIsMobileLyricsFullScreen,
    setIsFullScreenPlayerOpen,
    seekToTime,
  } = usePlayerStore();

  const lyricsScrollAreaRef = useRef<HTMLDivElement>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { extractColor } = useDominantColor();
  const [dominantColor, setDominantColor] = useState("#18181b");
  const lastImageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      currentSong?.imageUrl &&
      currentSong.imageUrl !== lastImageUrlRef.current
    ) {
      lastImageUrlRef.current = currentSong.imageUrl;
      extractColor(currentSong.imageUrl).then((color) => {
        setDominantColor(color || "#18181b");
      });
    } else if (!currentSong) {
      setDominantColor("#18181b");
    }
  }, [currentSong, extractColor]);

  useEffect(() => {
    if (currentSong?.lyrics) {
      setLyrics(parseLrc(currentSong.lyrics));
      setIsUserScrolling(false);
      if (lyricsScrollAreaRef.current) {
        lyricsScrollAreaRef.current.scrollTop = 0;
      }
    } else {
      setLyrics([]);
    }
  }, [currentSong]);

  useEffect(() => {
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
          requestAnimationFrame(() => {
            activeLineElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          });
        }
      }
    }
  }, [currentTime, lyrics, isUserScrolling]);

  const handleScroll = useCallback(() => {
    if (!isUserScrolling) setIsUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
      scrollTimeoutRef.current = null;
    }, 300);
  }, [isUserScrolling]);

  useEffect(() => {
    const scrollAreaElement = lyricsScrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (scrollAreaElement) {
      scrollAreaElement.addEventListener("scroll", handleScroll);
      scrollAreaElement.addEventListener("touchstart", () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        setIsUserScrolling(true);
      });
      scrollAreaElement.addEventListener("touchend", handleScroll);
      scrollAreaElement.addEventListener("touchcancel", handleScroll);
    }
    return () => {
      if (scrollAreaElement) {
        scrollAreaElement.removeEventListener("scroll", handleScroll);
        scrollAreaElement.removeEventListener("touchstart", () => {});
        scrollAreaElement.removeEventListener("touchend", () => {});
        scrollAreaElement.removeEventListener("touchcancel", () => {});
      }
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [handleScroll]);

  const handleClose = () => {
    if (isMobileFullScreen) {
      setIsMobileLyricsFullScreen(false);
      setIsFullScreenPlayerOpen(true);
    } else {
      setIsDesktopLyricsOpen(false);
    }
  };

  const handleLyricLineClick = (time: number) => {
    setIsUserScrolling(false);
    seekToTime(time);
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
        <p>{t("player.noLyrics")}</p>
        <Button variant="ghost" className="mt-4" onClick={handleClose}>
          {t("player.close")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div
        className={`flex flex-col items-center justify-start h-[calc(100vh - 1px)] p-4 sm:p-8 text-white ${
          isMobileFullScreen ? "fixed inset-0 z-[80]" : "w-full"
        }`}
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
            {t("player.lyrics")}
          </div>
          <div className="w-10 h-10" />
        </div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-1">{currentSong.title}</h2>
          <p className="text-zinc-400 text-lg">
            {getArtistNames(currentSong.artist, [])}
          </p>
        </div>
        <ScrollArea
          className="flex-1 w-full max-w-4xl text-center h-full"
          ref={lyricsScrollAreaRef}
        >
          {lyrics.map((line, index) => (
            <p
              key={index}
              className={`py-1 text-2xl px-2 sm:text-3xl font-semibold transition-all duration-200 lyric-line-${index} cursor-pointer hover:text-white ${
                currentTime >= line.time &&
                (index === lyrics.length - 1 ||
                  currentTime < lyrics[index + 1].time)
                  ? "text-violet-400 scale-105"
                  : "text-zinc-400"
              }`}
              onClick={() => handleLyricLineClick(line.time)}
            >
              {line.text}
            </p>
          ))}
          <div className="h-[50vh] w-full"></div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LyricsPage;
