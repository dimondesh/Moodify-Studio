// frontend/src/layout/AudioPlayer.tsx

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";

const AudioPlayer = () => {
  // --- Рефы для Web Audio API объектов ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const instrumentalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const vocalsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const instrumentalGainNodeRef = useRef<GainNode | null>(null);
  const vocalsGainNodeRef = useRef<GainNode | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);

  // --- Рефы для хранения декодированных аудио-буферов ---
  const instrumentalBufferRef = useRef<AudioBuffer | null>(null);
  const vocalsBufferRef = useRef<AudioBuffer | null>(null);

  // --- Рефы для отслеживания времени воспроизведения ---
  const startTimeRef = useRef(0); // Время AudioContext, когда трек начал играть
  const offsetTimeRef = useRef(0); // Смещение в треке (для перемотки)

  // --- Реф для предотвращения повторной загрузки той же песни ---
  const prevCurrentSongIdRef = useRef<string | null>(null);

  // --- НОВЫЙ РЕФ: Для отслеживания ID последнего активного запроса на загрузку ---
  const currentLoadRequestIdRef = useRef<string | null>(null);

  // --- Состояние для отслеживания готовности AudioContext ---
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);

  // --- Получение состояния и функций из Zustand Store ---
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

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // --- Эффект 1: Инициализация AudioContext и GainNodes ---
  useEffect(() => {
    if (audioContextRef.current) {
      console.log(
        "AudioContext already exists. Setting isAudioContextReady to true."
      );
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
      console.log("AudioContext created.");
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
      if (audioContext && (audioContext.state as string) === "suspended") {
        audioContext
          .resume()
          .then(() => {
            console.log(
              "AudioContext resumed successfully by user interaction."
            );
          })
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
        (audioContextRef.current.state as string) !== "closed"
      ) {
        audioContextRef.current
          .close()
          .then(() => {
            console.log("AudioContext closed during cleanup.");
            audioContextRef.current = null;
            setIsAudioContextReady(false);
          })
          .catch((err) => console.error("Error closing AudioContext:", err));
      }
    };
  }, []);

  // --- Эффект 2: Загрузка и декодирование аудио-файлов (при изменении currentSong) ---
  useEffect(() => {
    if (!isAudioContextReady) {
      console.warn(
        "Effect 2: AudioContext not ready, skipping audio buffer loading."
      );
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || (audioContext.state as string) === "closed") {
      console.warn(
        "Effect 2: AudioContext is not ready or closed during song change, cannot load audio."
      );
      return;
    }

    if (!currentSong) {
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      prevCurrentSongIdRef.current = null;
      currentLoadRequestIdRef.current = null; // Сбрасываем ID запроса
      return;
    }

    // Если песня не изменилась, нет необходимости заново загружать буферы.
    if (
      prevCurrentSongIdRef.current === currentSong._id &&
      instrumentalBufferRef.current
    ) {
      console.log(
        `Effect 2: Song ${currentSong.title} already loaded, skipping.`
      );
      return;
    }

    // Генерируем уникальный ID для текущего запроса на загрузку
    const loadRequestId = Date.now().toString(); // Простое уникальное ID
    currentLoadRequestIdRef.current = loadRequestId;
    console.log(
      `Effect 2: Starting new load request for ${currentSong.title} with ID: ${loadRequestId}`
    );

    prevCurrentSongIdRef.current = currentSong._id;

    const instrumentalUrl = currentSong.instrumentalUrl;
    const vocalsUrl = currentSong.vocalsUrl;

    const loadAudio = async (url: string): Promise<AudioBuffer> => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      if (!audioContext || (audioContext.state as string) === "closed") {
        throw new Error("AudioContext was closed during fetch/decode process.");
      }
      return audioContext.decodeAudioData(arrayBuffer);
    };

    const fetchAndDecodeAudio = async () => {
      // Останавливаем старые источники, если они активны, при смене песни.
      // ЭТО ВАЖНО: Мы делаем это *сразу*, как только начинается новая загрузка.
      if (instrumentalSourceRef.current) {
        instrumentalSourceRef.current.stop();
        instrumentalSourceRef.current.disconnect();
        instrumentalSourceRef.current = null;
        console.log(
          "Effect 2: Previous instrumental source stopped due to new song load."
        );
      }
      if (vocalsSourceRef.current) {
        vocalsSourceRef.current.stop();
        vocalsSourceRef.current.disconnect();
        vocalsSourceRef.current = null;
        console.log(
          "Effect 2: Previous vocals source stopped due to new song load."
        );
      }

      try {
        const [instrumentalBuffer, vocalsBuffer] = await Promise.all([
          loadAudio(instrumentalUrl),
          vocalsUrl ? loadAudio(vocalsUrl) : Promise.resolve(null),
        ]);

        // !!! КЛЮЧЕВАЯ ПРОВЕРКА !!!
        // Убеждаемся, что этот запрос на загрузку все еще актуален.
        // Если currentLoadRequestIdRef.current отличается, значит, между началом загрузки
        // и ее завершением пользователь переключил трек еще раз.
        if (currentLoadRequestIdRef.current !== loadRequestId) {
          console.warn(
            `Effect 2: Load request ID ${loadRequestId} is outdated. Ignoring results for ${currentSong.title}. Current active ID: ${currentLoadRequestIdRef.current}`
          );
          return; // Игнорируем устаревший результат
        }

        if (!audioContext || (audioContext.state as string) === "closed") {
          console.warn(
            "Effect 2: AudioContext closed during audio loading, aborting."
          );
          return;
        }

        instrumentalBufferRef.current = instrumentalBuffer;
        vocalsBufferRef.current = vocalsBuffer;

        setDuration(Math.floor(instrumentalBuffer.duration));
        setCurrentTime(0);
        offsetTimeRef.current = 0;
        startTimeRef.current = 0; // Сбрасываем startTime, чтобы при Play трек начинался с 0

        console.log(
          `Effect 2: Buffers loaded and valid for ${currentSong.title}. Duration: ${instrumentalBuffer.duration} seconds.`
        );
      } catch (error) {
        // !!! КЛЮЧЕВАЯ ПРОВЕРКА ПРИ ОШИБКЕ !!!
        // Если произошла ошибка, но это уже устаревший запрос, не сбрасываем состояние.
        if (currentLoadRequestIdRef.current !== loadRequestId) {
          console.warn(
            `Effect 2: Error in outdated load request ID ${loadRequestId}. Ignoring. Current active ID: ${currentLoadRequestIdRef.current}`
          );
          return;
        }

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
      // Очистка при смене песни/размонтировании: просто обнуляем буферы.
      // Источники были остановлены выше при начале новой загрузки.
      console.log(`Effect 2 CLEANUP for song ${currentSong.title}.`);
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      // Важно: не сбрасываем currentLoadRequestIdRef.current здесь,
      // так как следующий эффект уже мог установить новый ID.
    };
  }, [currentSong, isAudioContextReady, setDuration, setCurrentTime]);

  // --- Эффект 3: Управление воспроизведением (Play/Pause/Seek) ---
  useEffect(() => {
    if (
      !isAudioContextReady ||
      !currentSong ||
      !instrumentalBufferRef.current
    ) {
      // console.warn("EFFECT 3: Cannot manage playback - context/song/buffers not ready."); // Слишком много логов
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || (audioContext.state as string) === "closed") {
      console.warn("EFFECT 3: AudioContext is closed, cannot manage playback.");
      return;
    }

    // console.log(`EFFECT 3 TRIGGERED - isPlaying: ${isPlaying}, playerStoreCurrentTime: ${playerStoreCurrentTime}`); // Слишком много логов
    // console.log(`Current instrumentalSourceRef.current: ${instrumentalSourceRef.current ? "EXISTS" : "NULL"}`);

    const managePlayback = async () => {
      if (isPlaying) {
        const expectedCurrentTime = Math.floor(
          offsetTimeRef.current +
            (audioContext.currentTime - startTimeRef.current)
        );
        const isSeeking =
          Math.abs(playerStoreCurrentTime - expectedCurrentTime) > 1 &&
          playerStoreCurrentTime >= 0;

        // console.log(`  Playback State: PLAYING. Expected: ${expectedCurrentTime}, PlayerStore: ${playerStoreCurrentTime}, IsSeeking: ${isSeeking}`); // Слишком много логов

        if (isSeeking || !instrumentalSourceRef.current) {
          // Останавливаем существующие источники перед созданием новых, если они есть.
          if (instrumentalSourceRef.current) {
            instrumentalSourceRef.current.stop();
            instrumentalSourceRef.current.disconnect();
            instrumentalSourceRef.current = null;
            console.log(
              "  EFFECT 3: Previous instrumental source stopped for new playback/seek."
            );
          }
          if (vocalsSourceRef.current) {
            vocalsSourceRef.current.stop();
            vocalsSourceRef.current.disconnect();
            vocalsSourceRef.current = null;
            console.log(
              "  EFFECT 3: Previous vocals source stopped for new playback/seek."
            );
          }

          console.log(
            `  EFFECT 3: Creating and starting new playback sources (IsSeeking: ${isSeeking}, SourceExists: ${!!instrumentalSourceRef.current}).`
          );

          if ((audioContext.state as string) === "suspended") {
            await audioContext.resume();
            console.log("  EFFECT 3: AudioContext resumed for new playback.");
          }

          offsetTimeRef.current = playerStoreCurrentTime;
          startTimeRef.current = audioContext.currentTime;

          const newInstrumentalSource = audioContext.createBufferSource();
          newInstrumentalSource.buffer = instrumentalBufferRef.current;
          newInstrumentalSource.connect(instrumentalGainNodeRef.current!);
          instrumentalSourceRef.current = newInstrumentalSource;

          if (
            vocalsBufferRef.current &&
            vocalsGainNodeRef.current &&
            currentSong?.vocalsUrl
          ) {
            const newVocalsSource = audioContext.createBufferSource();
            newVocalsSource.buffer = vocalsBufferRef.current;
            newVocalsSource.connect(vocalsGainNodeRef.current);
            vocalsSourceRef.current = newVocalsSource;
          } else {
            if (vocalsGainNodeRef.current) {
              vocalsGainNodeRef.current.gain.value = 0;
            }
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

          newInstrumentalSource.onended = (event) => {
            if (event.target === instrumentalSourceRef.current) {
              console.log(
                "  EFFECT 3: Instrumental audio ended. Handling song end."
              );
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
          await audioContext.resume();
          console.log(
            "  EFFECT 3: AudioContext resumed from suspended state (isPlaying is true, source exists)."
          );
        } else {
          // console.log("  EFFECT 3: Playback already active and no seeking detected. No action needed for this render."); // Слишком много логов
        }
      } else {
        // isPlaying === false (PAUSED state)
        console.log("  EFFECT 3: Playback State: PAUSED.");
        if (instrumentalSourceRef.current) {
          instrumentalSourceRef.current.stop();
          instrumentalSourceRef.current.disconnect();
          instrumentalSourceRef.current = null;
          console.log(
            "  EFFECT 3: Instrumental source stopped and disconnected due to pause."
          );
        }
        if (vocalsSourceRef.current) {
          vocalsSourceRef.current.stop();
          vocalsSourceRef.current.disconnect();
          vocalsSourceRef.current = null;
          console.log(
            "  EFFECT 3: Vocals source stopped and disconnected due to pause."
          );
        }
        if ((audioContext.state as string) === "running") {
          offsetTimeRef.current +=
            audioContext.currentTime - startTimeRef.current;
          if (offsetTimeRef.current < 0) offsetTimeRef.current = 0;
          setCurrentTime(Math.floor(offsetTimeRef.current));
          audioContext
            .suspend()
            .then(() => {
              console.log(
                "  EFFECT 3: AudioContext suspended by play/pause toggle."
              );
            })
            .catch((err) =>
              console.error("Error suspending AudioContext:", err)
            );
        }
      }
    };

    managePlayback();

    return () => {
      // console.log("EFFECT 3 CLEANUP CALLED. instrumentalSourceRef.current at cleanup:", instrumentalSourceRef.current ? "EXISTS" : "NULL"); // Слишком много логов
    };
  }, [
    isPlaying,
    playerStoreCurrentTime,
    currentSong,
    isAudioContextReady,
    playNext,
    repeatMode,
    setCurrentTime,
    duration,
  ]);

  // --- Эффект 4: Управление громкостью (Master и Vocals) ---
  useEffect(() => {
    if (!isAudioContextReady) return;

    if (masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.value = masterVolume / 100;
    }
    if (vocalsGainNodeRef.current && currentSong?.vocalsUrl) {
      vocalsGainNodeRef.current.gain.value = vocalsVolume / 100;
    } else if (vocalsGainNodeRef.current) {
      vocalsGainNodeRef.current.gain.value = 0;
    }
  }, [vocalsVolume, masterVolume, currentSong, isAudioContextReady]);

  // --- Эффект 5: Обновление текущего времени в Zustand Store ---
  useEffect(() => {
    if (!isAudioContextReady) {
      console.warn(
        "Effect 5: AudioContext not ready, skipping time update loop."
      );
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || (audioContext.state as string) === "closed") {
      console.warn(
        "Effect 5: AudioContext is closed, skipping time update loop."
      );
      return;
    }

    let animationFrameId: number;

    const updateCurrentTimeLoop = () => {
      if (
        isPlayingRef.current &&
        instrumentalSourceRef.current &&
        (audioContext.state as string) === "running"
      ) {
        const elapsed = audioContext.currentTime - startTimeRef.current;
        const newTime = Math.floor(offsetTimeRef.current + elapsed);

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

    console.log("Effect 5: Starting time update loop.");
    animationFrameId = requestAnimationFrame(updateCurrentTimeLoop);

    return () => {
      console.log("Effect 5: Stopping time update loop.");
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAudioContextReady, duration, setCurrentTime]);

  return null;
};

export default AudioPlayer;
