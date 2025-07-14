// frontend/src/layout/AudioPlayer.tsx

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { usePlayCountStore } from "../stores/usePlayCountStore";

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

  // --- Реф для отслеживания ID последнего активного запроса на загрузку ---
  // Это помогает избежать race conditions, когда пользователь быстро переключает треки.
  const currentLoadRequestIdRef = useRef<string | null>(null);

  // --- Реф для отслеживания, было ли прослушивание уже засчитано для текущей песни ---
  const playCountIncrementedRef = useRef<boolean>(false);

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
    // Внимание: если у тебя есть функция типа `setSong` или `playSong` в usePlayerStore,
    // которая фактически меняет `currentSong` и потенциально `isPlaying`,
    // убедись, что она корректно обнуляет isPlaying при смене песни.
    // Тут мы полагаемся на то, что currentSong меняется, и Effect 2 его обрабатывает.
  } = usePlayerStore();

  const incrementPlayCount = usePlayCountStore(
    (state) => state.incrementPlayCount
  );

  // Используем реф для isPlaying, чтобы получить его актуальное значение внутри requestAnimationFrame
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Вспомогательная функция для остановки и отсоединения источника
  const stopAndDisconnectSource = (
    sourceRef: React.MutableRefObject<AudioBufferSourceNode | null>
  ) => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch (e) {
        console.warn(
          "[stopAndDisconnectSource] Error stopping or disconnecting audio source (it might already be stopped or not connected):",
          e
        );
      } finally {
        sourceRef.current = null;
      }
    }
  };

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

    // Слушатели для возобновления контекста при первом взаимодействии пользователя
    document.addEventListener("click", resumeContext, { once: true });
    document.addEventListener("keydown", resumeContext, { once: true });
    document.addEventListener("touchstart", resumeContext, { once: true });

    // Сброс флага прослушивания при монтировании компонента (или его перезапуске)
    playCountIncrementedRef.current = false;

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
      // Очищаем буферы и сбрасываем состояние плеера
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      usePlayerStore.setState({ isPlaying: false, currentSong: null }); // Убедимся, что плеер на паузе и трек сброшен
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || (audioContext.state as string) === "closed") {
      console.warn(
        "Effect 2: AudioContext is not ready or closed during song change, cannot load audio."
      );
      stopAndDisconnectSource(instrumentalSourceRef);
      stopAndDisconnectSource(vocalsSourceRef);
      usePlayerStore.setState({ isPlaying: false, currentSong: null });
      return;
    }

    // --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: СБРОС СОСТОЯНИЙ ПРИ ЛЮБОЙ СМЕНЕ currentSong ---
    // Здесь мы всегда сбрасываем `isPlaying` и `playCountIncrementedRef`
    // при любом изменении `currentSong`, чтобы подготовить плеер к новой загрузке/воспроизведению.
    // Это предотвратит случайные запуски и дублирование подсчета.
    console.log(
      `Effect 2: currentSong changed (${
        currentSong?._id || "None"
      }). Resetting playback flags.`
    );
    usePlayerStore.setState({ isPlaying: false }); // Всегда ставим на паузу при смене трека
    offsetTimeRef.current = 0;
    startTimeRef.current = 0;
    stopAndDisconnectSource(instrumentalSourceRef);
    stopAndDisconnectSource(vocalsSourceRef);
    playCountIncrementedRef.current = false; // Сбрасываем флаг прослушивания для новой/перезагруженной песни

    if (!currentSong) {
      instrumentalBufferRef.current = null;
      vocalsBufferRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      currentLoadRequestIdRef.current = null; // Сбрасываем ID запроса
      return; // Если currentSong нет, просто выходим
    }

    // Если песня та же самая (тот же _id), и буферы уже загружены,
    // то мы не перегружаем, а просто переключаемся в состояние "играет".
    // Это условие означает, что буферы готовы.
    if (
      instrumentalBufferRef.current &&
      instrumentalBufferRef.current.duration > 0 && // Убедимся, что буфер содержит данные
      // Если _id песни совпадает, и мы пытаемся играть её снова (например, кликнули ещё раз на ту же песню)
      currentSong._id === currentLoadRequestIdRef.current?.split("-")[0] // Проверяем ID из текущего запроса
    ) {
      console.log(
        `Effect 2: Song ${currentSong.title} already loaded and ready. Setting isPlaying: true.`
      );
      // *** КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ДЛЯ "ИГРАЕТ СРАЗУ" ***
      // Устанавливаем isPlaying в true, если трек уже загружен и выбран.
      // Effect 3 затем запустит воспроизведение.
      usePlayerStore.setState({ isPlaying: true });
      return; // Выходим, так как загрузка не нужна
    }

    // --- ЛОГИКА ЗАГРУЗКИ НОВОГО АУДИО ---
    // Генерируем уникальный ID для текущего запроса на загрузку, включая ID песни
    const loadRequestId = `${currentSong._id}-${Date.now()}`;
    currentLoadRequestIdRef.current = loadRequestId; // Сохраняем ID текущего активного запроса
    console.log(
      `Effect 2: Starting new audio load for ${currentSong.title} with ID: ${loadRequestId}`
    );

    const instrumentalUrl = currentSong.instrumentalUrl;
    const vocalsUrl = currentSong.vocalsUrl;

    const loadAudio = async (url: string): Promise<AudioBuffer> => {
      // Важно: Проверяем актуальность запроса перед КАЖДЫМ асинхронным шагом
      if (currentLoadRequestIdRef.current !== loadRequestId) {
        throw new Error(
          `Load request ID ${loadRequestId} is outdated. Aborting fetch.`
        );
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch audio for ${url}. Status: ${response.status} ${response.statusText}`
        );
      }
      if (currentLoadRequestIdRef.current !== loadRequestId) {
        throw new Error(
          `Load request ID ${loadRequestId} is outdated. Aborting arrayBuffer.`
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      if (currentLoadRequestIdRef.current !== loadRequestId) {
        throw new Error(
          `Load request ID ${loadRequestId} is outdated. Aborting decode.`
        );
      }
      if (!audioContext || (audioContext.state as string) === "closed") {
        throw new Error("AudioContext was closed during fetch/decode process.");
      }
      return audioContext.decodeAudioData(arrayBuffer);
    };

    const fetchAndDecodeAudio = async () => {
      try {
        const [instrumentalBuffer, vocalsBuffer] = await Promise.all([
          loadAudio(instrumentalUrl),
          vocalsUrl ? loadAudio(vocalsUrl) : Promise.resolve(null),
        ]);

        // !!! КЛЮЧЕВАЯ ПРОВЕРКА: Убеждаемся, что запрос все еще актуален после загрузки !!!
        if (currentLoadRequestIdRef.current !== loadRequestId) {
          console.warn(
            `Effect 2: Load request ID ${loadRequestId} is outdated (post-decode final check). Ignoring results for ${currentSong.title}. Current active ID: ${currentLoadRequestIdRef.current}`
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
        startTimeRef.current = 0;

        // *** КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ДЛЯ "ИГРАЕТ СРАЗУ" ***
        // Устанавливаем isPlaying в true только после успешной загрузки и готовности буферов.
        usePlayerStore.setState({ isPlaying: true });

        console.log(
          `Effect 2: Buffers loaded and valid for ${currentSong.title}. Duration: ${instrumentalBuffer.duration} seconds. Player set to PLAY.`
        );
      } catch (error: unknown) {
        // Игнорируем ошибки, если запрос уже устарел (например, пользователь быстро переключил трек)
        if (error instanceof Error && error.message.includes("outdated")) {
          console.warn(
            `Effect 2: Detected and ignored outdated load error for ${currentSong.title}.`
          );
          return;
        }
        if (currentLoadRequestIdRef.current !== loadRequestId) {
          console.warn(
            `Effect 2: Error in outdated load request ID ${loadRequestId}. Ignoring. Current active ID: ${currentLoadRequestIdRef.current}`
          );
          return;
        }

        console.error("Effect 2: Error loading or decoding audio:", error);
        // При ошибке загрузки сбрасываем состояние плеера и флаг прослушивания
        usePlayerStore.setState({ isPlaying: false, currentSong: null });
        instrumentalBufferRef.current = null;
        vocalsBufferRef.current = null;
        setDuration(0);
        setCurrentTime(0);
        playCountIncrementedRef.current = false;
      }
    };

    fetchAndDecodeAudio();

    return () => {
      console.log(
        `Effect 2 CLEANUP for song ${currentSong?.title || "No song"}.`
      );
      // При очистке эффекта (смене песни или размонтировании)
      // мы не обнуляем буферы сразу, так как они могут быть использованы Effect 3,
      // если isPlaying еще true. Их остановка и очистка происходит в managePlayback.
    };
  }, [currentSong, isAudioContextReady, setDuration, setCurrentTime]);
  // Важно: isPlaying убран из зависимостей Effect 2.
  // Effect 2 теперь ТОЛЬКО загружает и решает, когда устанавливать isPlaying=true.
  // Effect 3 отвечает за реакцию на isPlaying.

  // --- Эффект 3: Управление воспроизведением (Play/Pause/Seek) ---
  useEffect(() => {
    // Этот эффект теперь полностью реагирует на `isPlaying` и `currentSong`.
    // Он отвечает за создание/остановку аудио-источников.
    if (
      !isAudioContextReady ||
      !currentSong ||
      !instrumentalBufferRef.current
    ) {
      // Если плеер в состоянии "играет", но нет необходимых условий, ставим на паузу.
      if (isPlaying) {
        console.warn(
          "Effect 3: Cannot manage playback - context/song/buffers not ready. Forcing pause."
        );
        usePlayerStore.setState({ isPlaying: false });
        stopAndDisconnectSource(instrumentalSourceRef);
        stopAndDisconnectSource(vocalsSourceRef);
      }
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || (audioContext.state as string) === "closed") {
      console.warn("Effect 3: AudioContext is closed, cannot manage playback.");
      if (isPlaying) usePlayerStore.setState({ isPlaying: false });
      return;
    }

    const managePlayback = async () => {
      if (isPlaying) {
        // Если isPlaying true, но источники не созданы или нужна перемотка, создаем их.
        const expectedCurrentTime = Math.floor(
          offsetTimeRef.current +
            (audioContext.currentTime - startTimeRef.current)
        );
        const isSeeking =
          Math.abs(playerStoreCurrentTime - expectedCurrentTime) > 1 &&
          playerStoreCurrentTime >= 0;

        if (isSeeking || !instrumentalSourceRef.current) {
          stopAndDisconnectSource(instrumentalSourceRef);
          stopAndDisconnectSource(vocalsSourceRef);

          console.log(
            `  EFFECT 3: Creating and starting new playback sources (IsSeeking: ${isSeeking}).`
          );

          // Возобновляем AudioContext, если он приостановлен
          if ((audioContext.state as string) === "suspended") {
            await audioContext.resume();
            console.log("  EFFECT 3: AudioContext resumed for new playback.");
          }

          // Обновляем смещение и время старта
          offsetTimeRef.current = playerStoreCurrentTime;
          startTimeRef.current = audioContext.currentTime;

          // Создаем новые источники
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

          // Запускаем воспроизведение. Параметр `when` (первый аргумент) 0 означает "как можно скорее".
          newInstrumentalSource.start(0, offsetTimeRef.current);
          if (vocalsSourceRef.current) {
            vocalsSourceRef.current.start(0, offsetTimeRef.current);
          }

          // Обработчик окончания трека
          newInstrumentalSource.onended = (event) => {
            if (event.target === instrumentalSourceRef.current) {
              console.log(
                "  EFFECT 3: Instrumental audio ended. Handling song end."
              );
              stopAndDisconnectSource(instrumentalSourceRef);
              stopAndDisconnectSource(vocalsSourceRef);

              // --- Засчитываем прослушивание при завершении трека, если оно еще не было засчитано ---
              if (currentSong && !playCountIncrementedRef.current) {
                console.log(
                  `[Effect 3 - onended] Song ended. Incrementing play count for: ${currentSong._id}`
                );
                incrementPlayCount(currentSong._id);
                playCountIncrementedRef.current = true;
              }

              if (repeatMode === "one") {
                // Если режим повтора "один", просто перезапускаем текущий трек
                usePlayerStore.setState({ isPlaying: true, currentTime: 0 });
              } else if (repeatMode === "all") {
                // Если режим повтора "все", переходим к следующему треку в списке
                playNext();
                usePlayerStore.setState({ isPlaying: true }); // Убедимся, что плеер продолжит играть
              } else {
                // Иначе останавливаем воспроизведение
                usePlayerStore.setState({ isPlaying: false, currentTime: 0 });
              }
            }
          };
        } else if ((audioContext.state as string) === "suspended") {
          // Если isPlaying true, но контекст приостановлен, возобновляем его.
          await audioContext.resume();
          console.log(
            "  EFFECT 3: AudioContext resumed from suspended state (isPlaying is true, source exists)."
          );
        }
      } else {
        // isPlaying === false (PAUSED state)
        console.log("  EFFECT 3: Playback State: PAUSED.");
        stopAndDisconnectSource(instrumentalSourceRef);
        stopAndDisconnectSource(vocalsSourceRef);

        if ((audioContext.state as string) === "running") {
          // Обновляем offsetTime перед приостановкой
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
      // Очистка при размонтировании или смене зависимостей.
      // Важно: stopAndDisconnectSource(instrumentalSourceRef) и vocalsSourceRef
      // вызываются в managePlayback, когда isPlaying становится false или при isSeeking.
    };
  }, [
    isPlaying, // Реагируем на изменение isPlaying
    playerStoreCurrentTime, // Реагируем на перемотку
    currentSong, // Реагируем на смену песни (хотя основной запуск от Effect 2)
    isAudioContextReady,
    playNext,
    repeatMode,
    setCurrentTime,
    duration,
    incrementPlayCount,
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
      vocalsGainNodeRef.current.gain.value = 0; // Отключаем вокал, если нет URL
    }
  }, [vocalsVolume, masterVolume, currentSong, isAudioContextReady]);

  // --- Эффект 5: Обновление текущего времени в Zustand Store и подсчет прослушиваний ---
  useEffect(() => {
    if (!isAudioContextReady) {
      console.warn(
        "Effect 5: AudioContext not ready, skipping time update loop."
      );
      return () => {};
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || (audioContext.state as string) === "closed") {
      console.warn(
        "Effect 5: AudioContext is closed, skipping time update loop."
      );
      return () => {};
    }

    let animationFrameId: number;
    const PLAY_THRESHOLD_SECONDS = 3;

    const updateCurrentTimeLoop = () => {
      if (
        isPlayingRef.current && // Проверка, что плеер **активно играет**
        instrumentalSourceRef.current && // Проверка, что источник аудио существует
        (audioContext.state as string) === "running" && // Проверка, что AudioContext запущен
        currentSong && // Проверка, что есть текущая песня
        duration > 0 // Проверка, что известна длительность песни
      ) {
        const elapsed = audioContext.currentTime - startTimeRef.current;
        // eslint-disable-next-line prefer-const
        let newTime = Math.floor(offsetTimeRef.current + elapsed);

        // --- ЛОГИКА ПОДСЧЕТА ПРОСЛУШИВАНИЙ ---
        // Засчитываем прослушивание, только если песня активно играет
        // и проиграла больше порога, и прослушивание еще не было засчитано.
        if (
          newTime >= PLAY_THRESHOLD_SECONDS &&
          !playCountIncrementedRef.current
        ) {
          console.log(
            `[Effect 5 - Time Update] Song played over ${PLAY_THRESHOLD_SECONDS} seconds. Incrementing play count for: ${currentSong._id}`
          );
          incrementPlayCount(currentSong._id);
          playCountIncrementedRef.current = true; // Устанавливаем флаг, что засчитано
        }

        // Обновление текущего времени в Zustand Store
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
  }, [
    isAudioContextReady,
    duration,
    setCurrentTime,
    currentSong,
    incrementPlayCount,
  ]);

  return null;
};

export default AudioPlayer;
