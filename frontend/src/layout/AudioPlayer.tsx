import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSongRef = useRef<string | null>(null);

  const { currentSong, isPlaying, playNext, repeatMode } = usePlayerStore();

  useEffect(() => {
    if (isPlaying) audioRef.current?.play();
    else audioRef.current?.pause();
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      if (repeatMode === "one") {
        // Повторяем текущий трек
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        // Небольшая задержка, чтобы play точно сработал
        setTimeout(() => {
          audioRef.current?.play().catch(() => {});
        }, 0);
      } else if (repeatMode === "all") {
        playNext();
      } else {
        // repeatMode === "off"
        // Можно остановить воспроизведение
        usePlayerStore.setState({ isPlaying: false });
      }
    };

    audio?.addEventListener("ended", handleEnded);

    return () => audio?.removeEventListener("ended", handleEnded);
  }, [playNext, repeatMode]);

  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;
    const isSongChange = prevSongRef.current !== currentSong?.audioUrl;
    if (isSongChange) {
      audio.src = currentSong?.audioUrl;

      audio.currentTime = 0;
      prevSongRef.current = currentSong?.audioUrl;

      if (isPlaying) audio.play();
    }
  }, [currentSong, isPlaying]);

  return <audio ref={audioRef} />;
};

export default AudioPlayer;
