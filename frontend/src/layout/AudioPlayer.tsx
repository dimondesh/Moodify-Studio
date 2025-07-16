// frontend/src/layout/AudioPlayer.tsx

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { usePlayCountStore } from "@/stores/usePlayCountStore";

// Тип для синхронизированной строки текста
// LyricLine интерфейс может быть вынесен в общий файл типов,
// если он используется в нескольких местах, но для этой задачи его можно удалить,
// если он не используется в AudioPlayer вообще.
// Сейчас он не используется, так что его можно удалить.
// interface LyricLine {
//   time: number; // время в секундах
//   text: string;
// }

const AudioPlayer = () => {
  // --- Рефы для Web Audio API объектов ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const instrumentalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const vocalsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const instrumentalGainNodeRef = useRef<GainNode | null>(null);
  const vocalsGainNodeRef = useRef<GainNode | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);

  const instrumentalBufferRef = useRef<AudioBuffer | null>(null);
  const vocalsBufferRef = useRef<AudioBuffer | null>(null);

  const startTimeRef = useRef(0);
  const offsetTimeRef = useRef(0);

  const prevCurrentSongIdRef = useRef<string | null>(null);
  const currentLoadRequestIdRef = useRef<string | null>(null);

  const [isAudioContextReady, setIsAudioContextReady] = useState(false);

  const {
    currentSong,
    isPlaying,
    playNext,
    repeatMode,
    vocalsVolume,
    masterVolume,
    setCurrentTime,
    setDuration,
    currentTime: playerStoreCurrentTime,
    duration,
  } = usePlayerStore();

  const incrementPlayCount = usePlayCountStore(
    (state) => state.incrementPlayCount
  );

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Новый реф для защиты от повторного инкремента
  const playCountIncrementedRef = useRef(false);

  // --- Вспомогательная функция для парсинга LRC текста ---
  // <-- УДАЛЕНО: Функция parseLrc больше не нужна в AudioPlayer
  // const parseLrc = (lrcContent: string): LyricLine[] => {
  //   const lines = lrcContent.split("\n");
  //   const parsedLyrics: LyricLine[] = [];

  //   lines.forEach((line) => {
  //     const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
  //     if (timeMatch) {
  //       const minutes = parseInt(timeMatch[1], 10);
  //       const seconds = parseInt(timeMatch[2], 10);
  //       const milliseconds = parseInt(timeMatch[3].padEnd(3, "0"), 10);
  //       const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
  //       const text = line.replace(/\[.*?\]/g, "").trim();
  //       parsedLyrics.push({ time: timeInSeconds, text });
  //     }
  //   });

  //   parsedLyrics.sort((a, b) => a.time - b.time);
  //   return parsedLyrics;
  // };

  // --- Эффект 1: Инициализация AudioContext ---
  useEffect(() => {
    if (audioContextRef.current) {
      setIsAudioContextReady(true);
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API is not supported in this browser.");
      return;
    }

    try {
      audioContextRef.current = new AudioContextClass();
      setIsAudioContextReady(true);

      masterGainNodeRef.current = audioContextRef.current.createGain();
      masterGainNodeRef.current.connect(audioContextRef.current.destination);

      instrumentalGainNodeRef.current = audioContextRef.current.createGain();
      instrumentalGainNodeRef.current.connect(masterGainNodeRef.current);

      vocalsGainNodeRef.current = audioContextRef.current.createGain();
      vocalsGainNodeRef.current.connect(masterGainNodeRef.current);
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
      return;
    }

    const audioContext = audioContextRef.current;
    const resumeContext = () => {
      if (audioContext && audioContext.state === "suspended") {
        audioContext
          .resume()
          .catch((err) => console.error("Error resuming AudioContext:", err));
      }
    };

    document.addEventListener("click", resumeContext, { once: true });
    document.addEventListener("keydown", resumeContext, { once: true });
    document.addEventListener("touchstart", resumeContext, { once: true });

    return () => {
      document.removeEventListener("click", resumeContext);
      document.removeEventListener("keydown", resumeContext);
      document.removeEventListener("touchstart", resumeContext);

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current
          .close()
          .then(() => {
            audioContextRef.current = null;
            setIsAudioContextReady(false);
          })
          .catch((err) => console.error("Error closing AudioContext:", err));
      }
    };
  }, []);

  // --- Эффект 2: Загрузка и декодирование аудио при смене песни ---
  useEffect(() => {
    if (!isAudioContextReady) {
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") return;

    if (!currentSong) {
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      prevCurrentSongIdRef.current = null;
      currentLoadRequestIdRef.current = null;
      return;
    }

    // Если та же песня и инструментал уже загружен, выходим
    if (
      prevCurrentSongIdRef.current === currentSong._id &&
      instrumentalBufferRef.current
    ) {
      return;
    }

    const loadRequestId = Date.now().toString();
    currentLoadRequestIdRef.current = loadRequestId;
    prevCurrentSongIdRef.current = currentSong._id;

    const instrumentalUrl = currentSong.instrumentalUrl;
    const vocalsUrl = currentSong.vocalsUrl;

    const loadAudio = async (url: string): Promise<AudioBuffer> => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      if (!audioContext || audioContext.state === "closed") {
        throw new Error("AudioContext closed during fetch/decode.");
      }
      return audioContext.decodeAudioData(arrayBuffer);
    };

    const fetchAndDecodeAudio = async () => {
      // Останавливаем и отключаем предыдущие источники, если они есть
      if (instrumentalSourceRef.current) {
        instrumentalSourceRef.current.stop();
        instrumentalSourceRef.current.disconnect();
        instrumentalSourceRef.current = null;
      }
      if (vocalsSourceRef.current) {
        vocalsSourceRef.current.stop();
        vocalsSourceRef.current.disconnect();
        vocalsSourceRef.current = null;
      }

      try {
        const [instrumentalBuffer, vocalsBuffer] = await Promise.all([
          loadAudio(instrumentalUrl),
          vocalsUrl ? loadAudio(vocalsUrl) : Promise.resolve(null),
        ]);

        // Проверка, не был ли инициирован новый запрос на загрузку, пока этот выполнялся
        if (currentLoadRequestIdRef.current !== loadRequestId) return;

        if (!audioContext || audioContext.state === "closed") return;

        instrumentalBufferRef.current = instrumentalBuffer;
        vocalsBufferRef.current = vocalsBuffer;

        playCountIncrementedRef.current = false; // сброс счётчика при новой песне

        setDuration(Math.floor(instrumentalBuffer.duration));
        setCurrentTime(0);
        offsetTimeRef.current = 0;
        startTimeRef.current = 0;
      } catch (error) {
        if (currentLoadRequestIdRef.current !== loadRequestId) return;
        console.error("Effect 2: Error loading or decoding audio:", error);
        usePlayerStore.setState({ isPlaying: false });
        instrumentalBufferRef.current = null;
        vocalsBufferRef.current = null;
        setDuration(0);
        setCurrentTime(0);
      }
    };

    fetchAndDecodeAudio();

    return () => {
      // Сброс буферов при размонтировании или смене песни
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
    };
  }, [currentSong, isAudioContextReady, setDuration, setCurrentTime]);

  // --- Эффект 3: Управление воспроизведением (старт/пауза/перемотка) ---
  useEffect(() => {
    if (
      !isAudioContextReady ||
      !currentSong ||
      !instrumentalBufferRef.current
    ) {
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") return;

    const managePlayback = async () => {
      if (isPlaying) {
        const expectedCurrentTime = Math.floor(
          offsetTimeRef.current +
            (audioContext.currentTime - startTimeRef.current)
        );
        const isSeeking =
          Math.abs(playerStoreCurrentTime - expectedCurrentTime) > 1 &&
          playerStoreCurrentTime >= 0;

        if (isSeeking || !instrumentalSourceRef.current) {
          // Останавливаем и отключаем текущие источники перед созданием новых
          if (instrumentalSourceRef.current) {
            instrumentalSourceRef.current.stop();
            instrumentalSourceRef.current.disconnect();
            instrumentalSourceRef.current = null;
          }
          if (vocalsSourceRef.current) {
            vocalsSourceRef.current.stop();
            vocalsSourceRef.current.disconnect();
            vocalsSourceRef.current = null;
          }

          if (audioContext.state === "suspended") {
            await audioContext.resume();
          }

          offsetTimeRef.current = playerStoreCurrentTime;
          startTimeRef.current = audioContext.currentTime;

          const newInstrumentalSource = audioContext.createBufferSource();
          newInstrumentalSource.buffer = instrumentalBufferRef.current;
          newInstrumentalSource.connect(instrumentalGainNodeRef.current!);
          instrumentalSourceRef.current = newInstrumentalSource;

          // Подключаем вокальный трек, если он есть
          if (
            vocalsBufferRef.current &&
            vocalsGainNodeRef.current &&
            currentSong?.vocalsUrl
          ) {
            const newVocalsSource = audioContext.createBufferSource();
            newVocalsSource.buffer = vocalsBufferRef.current;
            newVocalsSource.connect(vocalsGainNodeRef.current);
            vocalsSourceRef.current = newVocalsSource;
          } else if (vocalsGainNodeRef.current) {
            // Если вокала нет или URL пустой, обнуляем гейн для вокала
            vocalsGainNodeRef.current.gain.value = 0;
          }

          newInstrumentalSource.start(
            audioContext.currentTime,
            offsetTimeRef.current
          );
          if (vocalsSourceRef.current) {
            vocalsSourceRef.current.start(
              audioContext.currentTime,
              offsetTimeRef.current
            );
          }

          // Инкремент счётчика воспроизведений
          if (!playCountIncrementedRef.current) {
            incrementPlayCount(currentSong._id);
            playCountIncrementedRef.current = true;
          }

          // Обработчик окончания воспроизведения песни
          newInstrumentalSource.onended = (event) => {
            // Убеждаемся, что это событие от текущего источника
            if (event.target === instrumentalSourceRef.current) {
              // Останавливаем и отключаем все источники после завершения
              if (instrumentalSourceRef.current) {
                instrumentalSourceRef.current.stop();
                instrumentalSourceRef.current.disconnect();
                instrumentalSourceRef.current = null;
              }
              if (vocalsSourceRef.current) {
                vocalsSourceRef.current.stop();
                vocalsSourceRef.current.disconnect();
                vocalsSourceRef.current = null;
              }

              // Логика повтора/следующей песни
              if (repeatMode === "one") {
                usePlayerStore.setState({ isPlaying: true, currentTime: 0 });
              } else if (repeatMode === "all") {
                playNext();
              } else {
                usePlayerStore.setState({ isPlaying: false, currentTime: 0 });
              }
            }
          };
        } else if (audioContext.state === "suspended") {
          // Если контекст приостановлен, но не было перемотки, просто возобновляем
          await audioContext.resume();
        }
      } else {
        // Если воспроизведение остановлено (isPlaying = false)
        if (instrumentalSourceRef.current) {
          instrumentalSourceRef.current.stop();
          instrumentalSourceRef.current.disconnect();
          instrumentalSourceRef.current = null;
        }
        if (vocalsSourceRef.current) {
          vocalsSourceRef.current.stop();
          vocalsSourceRef.current.disconnect();
          vocalsSourceRef.current = null;
        }
        if (audioContext.state === "running") {
          // Сохраняем текущее время воспроизведения перед приостановкой
          offsetTimeRef.current +=
            audioContext.currentTime - startTimeRef.current;
          if (offsetTimeRef.current < 0) offsetTimeRef.current = 0; // Защита от отрицательного времени
          setCurrentTime(Math.floor(offsetTimeRef.current));
          audioContext
            .suspend()
            .catch((err) =>
              console.error("Error suspending AudioContext:", err)
            );
        }
      }
    };

    managePlayback();
  }, [
    isPlaying,
    playerStoreCurrentTime,
    currentSong,
    isAudioContextReady,
    playNext,
    repeatMode,
    setCurrentTime,
    duration,
    incrementPlayCount,
  ]);

  // --- Эффект 4: Обновление громкости ---
  useEffect(() => {
    if (!isAudioContextReady) return;

    if (masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.value = masterVolume / 100;
    }
    if (vocalsGainNodeRef.current && currentSong?.vocalsUrl) {
      vocalsGainNodeRef.current.gain.value = vocalsVolume / 100;
    } else if (vocalsGainNodeRef.current) {
      // Если у текущей песни нет вокального URL, обнуляем громкость вокала
      vocalsGainNodeRef.current.gain.value = 0;
    }
  }, [vocalsVolume, masterVolume, currentSong, isAudioContextReady]);

  // --- Эффект 5: Обновление текущего времени в сторе (для UI) ---
  useEffect(() => {
    if (!isAudioContextReady) return;

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") return;

    let animationFrameId: number;

    const updateCurrentTimeLoop = () => {
      // Обновляем currentTime только если песня играет и контекст активен
      if (
        isPlayingRef.current &&
        instrumentalSourceRef.current &&
        audioContext.state === "running"
      ) {
        const elapsed = audioContext.currentTime - startTimeRef.current;
        const newTime = Math.floor(offsetTimeRef.current + elapsed);

        // Предотвращаем бесконечные обновления, если время уже максимально
        if (duration && newTime > duration) {
          if (usePlayerStore.getState().currentTime !== duration) {
            setCurrentTime(duration);
          }
        } else if (
          newTime >= 0 &&
          newTime <= duration! &&
          Math.abs(usePlayerStore.getState().currentTime - newTime) > 0.5
        ) {
          if (usePlayerStore.getState().currentTime !== newTime) {
            setCurrentTime(newTime);
          }
        }
      }
      animationFrameId = requestAnimationFrame(updateCurrentTimeLoop);
    };

    animationFrameId = requestAnimationFrame(updateCurrentTimeLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAudioContextReady, duration, setCurrentTime]);

  return null;
};

export default AudioPlayer;
