// src/layout/AudioPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { usePlayCountStore } from "@/stores/usePlayCountStore";
import { webAudioService } from "../lib/webAudio";

const AudioPlayer = () => {
  // --- Рефы для Web Audio API объектов ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const instrumentalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const vocalsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const instrumentalGainNodeRef = useRef<GainNode | null>(null);
  const vocalsGainNodeRef = useRef<GainNode | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null); // Главный Gain Node для всего микса

  const instrumentalBufferRef = useRef<AudioBuffer | null>(null);
  const vocalsBufferRef = useRef<AudioBuffer | null>(null);

  const startTimeRef = useRef(0);
  const offsetTimeRef = useRef(0);

  const prevCurrentSongIdRef = useRef<string | null>(null);
  const currentLoadRequestIdRef = useRef<string | null>(null);

  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  // Состояние для отслеживания актуального состояния AudioContext, но уже не используется для дебага UI
  const [, setAudioContextState] = useState<
    // Убрал audioContextState из зависимостей рендера
    AudioContextState | "uninitialized"
  >("uninitialized");

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

  const playCountIncrementedRef = useRef(false);

  // --- Эффект 1: Инициализация AudioContext и WebAudioService ---
  useEffect(() => {
    // Если AudioContext уже существует и готов, не переинициализируем, но убедимся, что сервис знает о нем
    if (
      audioContextRef.current &&
      masterGainNodeRef.current &&
      isAudioContextReady
    ) {
      if (!webAudioService.getAudioContext()) {
        webAudioService.init(
          audioContextRef.current,
          masterGainNodeRef.current,
          audioContextRef.current.destination
        );
        webAudioService.applySettingsToGraph();
      }
      setAudioContextState(audioContextRef.current.state); // Обновляем состояние, но без рендеринга
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API is not supported in this browser.");
      setIsAudioContextReady(false);
      setAudioContextState("uninitialized");
      return;
    }

    try {
      const newAudioContext = new AudioContextClass();
      audioContextRef.current = newAudioContext;

      masterGainNodeRef.current = newAudioContext.createGain();
      instrumentalGainNodeRef.current = newAudioContext.createGain();
      vocalsGainNodeRef.current = newAudioContext.createGain();

      instrumentalGainNodeRef.current.connect(masterGainNodeRef.current);
      vocalsGainNodeRef.current.connect(masterGainNodeRef.current);

      // Инициализируем WebAudioService с masterGainNode как входом
      webAudioService.init(
        newAudioContext,
        masterGainNodeRef.current, // Вход для WebAudioService
        newAudioContext.destination // Выход для WebAudioService
      );
      webAudioService.applySettingsToGraph(); // Применяем настройки сразу после инициализации сервиса

      setIsAudioContextReady(true);
      setAudioContextState(newAudioContext.state);

      // Добавляем слушателя для изменения состояния контекста
      newAudioContext.onstatechange = () => {
        setAudioContextState(newAudioContext.state);
        // Принудительно применяем настройки, если контекст возобновился
        if (newAudioContext.state === "running") {
          webAudioService.applySettingsToGraph();
        }
      };
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
      setIsAudioContextReady(false);
      setAudioContextState("closed");
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

    // Слушатели событий для возобновления контекста
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
            masterGainNodeRef.current = null;
            instrumentalGainNodeRef.current = null;
            vocalsGainNodeRef.current = null;
            setIsAudioContextReady(false);
            setAudioContextState("closed");
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
    if (!audioContext || audioContext.state === "closed") {
      return;
    }

    if (!currentSong) {
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
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      prevCurrentSongIdRef.current = null;
      currentLoadRequestIdRef.current = null;
      return;
    }

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

        if (currentLoadRequestIdRef.current !== loadRequestId) {
          return;
        }

        if (!audioContext || audioContext.state === "closed") return;

        instrumentalBufferRef.current = instrumentalBuffer;
        vocalsBufferRef.current = vocalsBuffer;

        playCountIncrementedRef.current = false;

        setDuration(Math.floor(instrumentalBuffer.duration));
        setCurrentTime(0);
        offsetTimeRef.current = 0;
        startTimeRef.current = 0;
      } catch (error) {
        if (currentLoadRequestIdRef.current !== loadRequestId) return;
        console.error("Error loading or decoding audio:", error);
        usePlayerStore.setState({ isPlaying: false });
        instrumentalBufferRef.current = null;
        vocalsBufferRef.current = null;
        setDuration(0);
        setCurrentTime(0);
      }
    };

    fetchAndDecodeAudio();

    return () => {
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
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") {
      return;
    }

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

          if (!playCountIncrementedRef.current) {
            incrementPlayCount(currentSong._id);
            playCountIncrementedRef.current = true;
          }

          newInstrumentalSource.onended = (event) => {
            if (event.target === instrumentalSourceRef.current) {
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
        }
      } else {
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
          offsetTimeRef.current +=
            audioContext.currentTime - startTimeRef.current;
          if (offsetTimeRef.current < 0) offsetTimeRef.current = 0;
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
    if (!isAudioContextReady) {
      return;
    }

    if (masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.value = masterVolume / 100;
    }
    if (vocalsGainNodeRef.current) {
      if (currentSong?.vocalsUrl) {
        vocalsGainNodeRef.current.gain.value = vocalsVolume / 100;
      } else {
        vocalsGainNodeRef.current.gain.value = 0;
      }
    }
  }, [vocalsVolume, masterVolume, currentSong, isAudioContextReady]);

  // --- Эффект 5: Обновление текущего времени в сторе (для UI) ---
  useEffect(() => {
    if (!isAudioContextReady) {
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") {
      return;
    }

    let animationFrameId: number;

    const updateCurrentTimeLoop = () => {
      if (
        isPlayingRef.current &&
        instrumentalSourceRef.current &&
        audioContext.state === "running"
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

    animationFrameId = requestAnimationFrame(updateCurrentTimeLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAudioContextReady, duration, setCurrentTime]);

  return null;
};

export default AudioPlayer;
