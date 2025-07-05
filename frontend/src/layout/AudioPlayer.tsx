import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSongRef = useRef<string | null>(null);

  const { currentSong, isPlaying, playNext, repeatMode } = usePlayerStore();

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Playback error:", err);
        }
      });
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      if (repeatMode === "one") {
        if (!audio) return;
        audio.currentTime = 0;
        setTimeout(() => {
          audio.play().catch(() => {});
        }, 0);
      } else if (repeatMode === "all") {
        playNext();
      } else {
        usePlayerStore.setState({ isPlaying: false });
      }
    };

    audio?.addEventListener("ended", handleEnded);

    return () => {
      audio?.removeEventListener("ended", handleEnded);
    };
  }, [playNext, repeatMode]);

  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const isSongChange = prevSongRef.current !== currentSong.audioUrl;

    if (isSongChange) {
      audio.src = currentSong.audioUrl;
      audio.currentTime = 0;
      prevSongRef.current = currentSong.audioUrl;

      const handleCanPlay = () => {
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch((err) => {
            if (err.name !== "AbortError") {
              console.warn("Play error:", err);
            }
          });
        }
      };

      audio.addEventListener("canplay", handleCanPlay, { once: true });

      return () => {
        audio.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [currentSong]);

  return <audio ref={audioRef} />;
};

export default AudioPlayer;
