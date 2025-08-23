// frontend/src/layout/AudioPlayer.tsx

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { webAudioService, useAudioSettingsStore } from "../lib/webAudio";
import { useAuthStore } from "@/stores/useAuthStore";
import { axiosInstance } from "@/lib/axios";
import { useMusicStore } from "@/stores/useMusicStore";
import { useOfflineStore } from "@/stores/useOfflineStore";
import { silentAudioService } from "@/lib/silentAudioService";

const AudioPlayer = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const instrumentalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const vocalsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(
    null
  );

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
  const [, setAudioContextState] = useState<
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
    currentTime,
    duration,
    originalDuration,
  } = usePlayerStore();

  const { playbackRateEnabled, playbackRate } = useAudioSettingsStore();
  const playbackRateRef = useRef(1.0); // Используем ref для доступа в requestAnimationFrame

  const { isOffline } = useOfflineStore();
  const { user } = useAuthStore();
  const listenRecordedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const lastPlayerStoreCurrentTimeRef = useRef(0);

  useEffect(() => {
    const audioEl = silentAudioRef.current;
    if (!audioEl) return;

    let objectUrl: string;

    const setupSilentAudio = async () => {
      try {
        const response = await fetch("/silent.mp3");
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        audioEl.src = objectUrl;

        silentAudioService.init(audioEl);
        console.log("Silent audio initialized and ready.");
      } catch (error) {
        console.error("Failed to load silent audio:", error);
      }
    };

    setupSilentAudio();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  useEffect(() => {
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

    if (
      audioContextRef.current &&
      masterGainNodeRef.current &&
      audioContextRef.current.state !== "closed"
    ) {
      if (
        webAudioService.getAudioContext() !== audioContextRef.current ||
        webAudioService.getAnalyserNode() === null
      ) {
        webAudioService.init(
          audioContextRef.current,
          masterGainNodeRef.current,
          audioContextRef.current.destination
        );
      }
      setAudioContextState(audioContextRef.current.state);
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

      webAudioService.init(
        newAudioContext,
        masterGainNodeRef.current,
        newAudioContext.destination
      );

      if (silentAudioRef.current && !mediaElementSourceRef.current) {
        mediaElementSourceRef.current =
          newAudioContext.createMediaElementSource(silentAudioRef.current);
        mediaElementSourceRef.current.connect(newAudioContext.destination);
        console.log(
          "Silent audio source connected to AudioContext destination."
        );
      }

      setIsAudioContextReady(true);
      setAudioContextState(newAudioContext.state);
      newAudioContext.onstatechange = () => {
        setAudioContextState(newAudioContext.state);
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
            if (mediaElementSourceRef.current) {
              mediaElementSourceRef.current.disconnect();
              mediaElementSourceRef.current = null;
            }
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
    if (!audioContext || audioContext.state === "closed") return;

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
      lastPlayerStoreCurrentTimeRef.current = 0;
      return;
    }

    if (
      prevCurrentSongIdRef.current === currentSong._id &&
      instrumentalBufferRef.current
    ) {
      if (Math.abs(currentTime - 0) < 0.5) {
        setCurrentTime(0);
      }
      offsetTimeRef.current = 0;
      startTimeRef.current = 0;
      lastPlayerStoreCurrentTimeRef.current = 0;
      return;
    }

    const loadRequestId = Date.now().toString();
    currentLoadRequestIdRef.current = loadRequestId;
    prevCurrentSongIdRef.current = currentSong._id;

    const instrumentalUrl = currentSong.instrumentalUrl;
    const vocalsUrl = currentSong.vocalsUrl;

    const loadAudio = async (url: string): Promise<AudioBuffer> => {
      try {
        const response = await fetch(url, { cache: "default" });

        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for url ${url}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!audioContext || audioContext.state === "closed") {
          throw new Error("AudioContext closed during fetch/decode.");
        }
        return audioContext.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error(
          `[AudioPlayer] Failed to fetch or decode audio from ${url}:`,
          error
        );
        throw error;
      }
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

        if (currentLoadRequestIdRef.current !== loadRequestId) return;
        if (!audioContext || audioContext.state === "closed") return;

        instrumentalBufferRef.current = instrumentalBuffer;
        vocalsBufferRef.current = vocalsBuffer;

        // --- ИЗМЕНЕНИЕ: Устанавливаем и оригинальную, и отображаемую длительность ---
        const originalDur = Math.floor(instrumentalBuffer.duration);
        const currentRate = useAudioSettingsStore.getState().playbackRateEnabled
          ? useAudioSettingsStore.getState().playbackRate
          : 1.0;
        const displayDuration = Math.floor(originalDur / currentRate);

        setDuration(displayDuration, originalDur);
        setCurrentTime(0);
        offsetTimeRef.current = 0;
        startTimeRef.current = 0;
        lastPlayerStoreCurrentTimeRef.current = 0;
      } catch (error) {
        if (currentLoadRequestIdRef.current !== loadRequestId) return;
        console.error("Error loading or decoding audio:", error);
        usePlayerStore.setState({ isPlaying: false });
        instrumentalBufferRef.current = null;
        vocalsBufferRef.current = null;
        setDuration(0);
        setCurrentTime(0);
        lastPlayerStoreCurrentTimeRef.current = 0;
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
    if (!audioContext || audioContext.state === "closed") return;

    const currentTrackTime =
      offsetTimeRef.current + (audioContext.currentTime - startTimeRef.current);

    const isSeeking =
      Math.abs(currentTime - currentTrackTime) > 0.5 &&
      currentTime !== lastPlayerStoreCurrentTimeRef.current;

    lastPlayerStoreCurrentTimeRef.current = currentTime;

    const managePlayback = async () => {
      if (isPlaying) {
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

          if (audioContext.state === "suspended") await audioContext.resume();

          offsetTimeRef.current = currentTime;
          startTimeRef.current = audioContext.currentTime;

          const newInstrumentalSource = audioContext.createBufferSource();
          newInstrumentalSource.buffer = instrumentalBufferRef.current;

          const currentRate = playbackRateEnabled ? playbackRate : 1.0;
          newInstrumentalSource.playbackRate.value = currentRate;

          newInstrumentalSource.connect(instrumentalGainNodeRef.current!);
          instrumentalSourceRef.current = newInstrumentalSource;

          if (
            vocalsBufferRef.current &&
            vocalsGainNodeRef.current &&
            currentSong?.vocalsUrl
          ) {
            const newVocalsSource = audioContext.createBufferSource();
            newVocalsSource.buffer = vocalsBufferRef.current;

            newVocalsSource.playbackRate.value = currentRate;

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
              } else {
                playNext();
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
    currentTime,
    currentSong,
    isAudioContextReady,
    playNext,
    repeatMode,
    setCurrentTime,
    duration,
    playbackRate, // <-- Добавляем зависимости
    playbackRateEnabled, // <-- Добавляем зависимости
  ]);

  // --- Эффект 4: Обновление громкости (БЕЗ ИЗМЕНЕНИЙ) ---
  useEffect(() => {
    if (!isAudioContextReady) return;

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

  // --- НОВЫЙ ЭФФЕКТ: Реакция на изменение скорости и пересчет времени/длительности ---
  useEffect(() => {
    const currentRate = playbackRateEnabled ? playbackRate : 1.0;
    playbackRateRef.current = currentRate; // Обновляем ref для rAF

    if (originalDuration > 0) {
      const newDisplayDuration = Math.floor(originalDuration / currentRate);
      setDuration(newDisplayDuration, originalDuration);
    }

    const instrumentalSource = instrumentalSourceRef.current;
    const vocalsSource = vocalsSourceRef.current;
    const audioContext = audioContextRef.current;

    if (instrumentalSource && audioContext) {
      // Плавный переход только при изменении "на лету"
      instrumentalSource.playbackRate.linearRampToValueAtTime(
        currentRate,
        audioContext.currentTime + 0.5
      );
      if (vocalsSource) {
        vocalsSource.playbackRate.linearRampToValueAtTime(
          currentRate,
          audioContext.currentTime + 0.5
        );
      }
    }
  }, [playbackRate, playbackRateEnabled, originalDuration, setDuration]);

  // --- Эффект 5: Обновление текущего времени в сторе   ---
  useEffect(() => {
    if (!isAudioContextReady) return;

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === "closed") return;

    let animationFrameId: number;

    const updateCurrentTimeLoop = () => {
      if (
        isPlayingRef.current &&
        instrumentalSourceRef.current &&
        audioContext.state === "running"
      ) {
        const elapsedRealTime = audioContext.currentTime - startTimeRef.current;
        // --- ИСПРАВЛЕНИЕ 2: Учитываем скорость при расчете времени ---
        const elapsedSongTime = elapsedRealTime * playbackRateRef.current;
        const newTime = Math.floor(offsetTimeRef.current + elapsedSongTime);

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

  useEffect(() => {
    listenRecordedRef.current = false;
  }, [currentSong]);

  useEffect(() => {
    if (
      isPlaying &&
      user &&
      currentSong &&
      currentSong._id &&
      currentTime >= 30 &&
      !listenRecordedRef.current &&
      !isOffline
    ) {
      listenRecordedRef.current = true;
      const songId = currentSong._id;
      const requestUrl = `/songs/${songId}/listen`;
      console.log(`[AudioPlayer] Preparing to send POST to: ${requestUrl}`);
      axiosInstance
        .post(requestUrl)
        .then((response) => {
          if (response.data.success) {
            console.log(
              `[AudioPlayer] Listen recorded successfully for song: ${currentSong.title}`
            );
          }
          useMusicStore.getState().fetchRecentlyListenedSongs();
        })
        .catch((error) => {
          listenRecordedRef.current = false;
          console.error("[AudioPlayer] Failed to record listen. Details:", {
            errorMessage: error.message,
            requestUrl: requestUrl,
            songId: songId,
            errorResponse: error.response?.data,
          });
        });
    }
  }, [currentTime, isPlaying, currentSong, user, isOffline]);

  return (
    <>
      <audio ref={silentAudioRef} src="/silent.mp3" loop playsInline />
    </>
  );
};

export default AudioPlayer;
