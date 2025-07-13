// frontend/src/layout/AudioPlayer.tsx

import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";

const AudioPlayer = () => {
  const instrumentalAudioRef = useRef<HTMLAudioElement>(null);
  const vocalsAudioRef = useRef<HTMLAudioElement>(null);

  const prevInstrumentalUrlRef = useRef<string | null>(null);
  const prevVocalsUrlRef = useRef<string | null>(null);

  const {
    currentSong,
    isPlaying,
    playNext,
    repeatMode,
    vocalsVolume,
    masterVolume,
    setCurrentTime,
    setDuration,
  } = usePlayerStore();

  // Эффект для загрузки SRC, установки громкости и начальной синхронизации
  useEffect(() => {
    const instrumentalAudio = instrumentalAudioRef.current;
    const vocalsAudio = vocalsAudioRef.current;

    // Важно: Эта функция должна срабатывать, когда currentSong меняется на null
    // или когда мы начинаем новый трек.
    if (!instrumentalAudio || !currentSong) {
      setCurrentTime(0);
      setDuration(0);
      if (instrumentalAudio) {
        instrumentalAudio.src = "";
        instrumentalAudio.load(); // Очищаем и загружаем, чтобы сбросить состояние
      }
      if (vocalsAudio) {
        vocalsAudio.src = "";
        vocalsAudio.load(); // Очищаем и загружаем
        vocalsAudio.muted = true; // Мьютим, если нет вокала
      }
      prevInstrumentalUrlRef.current = null;
      prevVocalsUrlRef.current = null;
      return;
    }

    const instrumentalUrl = currentSong.instrumentalUrl;
    const vocalsUrl = currentSong.vocalsUrl || null;

    let instrumentalChanged = false;
    if (prevInstrumentalUrlRef.current !== instrumentalUrl) {
      instrumentalAudio.src = instrumentalUrl;
      instrumentalAudio.load();
      instrumentalAudio.currentTime = 0; // Сброс времени при новой песне
      prevInstrumentalUrlRef.current = instrumentalUrl;
      instrumentalChanged = true;
    }

    let vocalsChanged = false;
    if (vocalsAudio && vocalsUrl && prevVocalsUrlRef.current !== vocalsUrl) {
      vocalsAudio.src = vocalsUrl;
      vocalsAudio.load();
      vocalsAudio.currentTime = 0; // Сброс времени при новой песне
      vocalsAudio.muted = false; // Явно unmute при новой загрузке вокала
      prevVocalsUrlRef.current = vocalsUrl;
      vocalsChanged = true;
    } else if (vocalsAudio && !vocalsUrl && vocalsAudio.src !== "") {
      // Если вокала больше нет для этой песни
      vocalsAudio.src = "";
      vocalsAudio.load();
      vocalsAudio.currentTime = 0;
      vocalsAudio.muted = true; // Мьютим, если вокала нет
      prevVocalsUrlRef.current = null;
      vocalsChanged = true;
    }

    // Управление громкостью
    instrumentalAudio.volume = masterVolume / 100;
    if (vocalsAudio) {
      // Если vocalsAudio элемент существует
      if (vocalsUrl) {
        // И если есть vocalsUrl для текущей песни
        vocalsAudio.volume = (vocalsVolume / 100) * (masterVolume / 100);
        vocalsAudio.muted = false; // Убедимся, что вокал не замьючен
      } else {
        // Если vocalsUrl нет
        vocalsAudio.volume = 0;
        vocalsAudio.muted = true; // Мьютим, чтобы не было никаких призвуков
      }
    }

    instrumentalAudio.playbackRate = 1;
    if (vocalsAudio) {
      vocalsAudio.playbackRate = 1;
    }

    // Эта функция будет вызываться, когда обе дорожки будут готовы или хотя бы
    // основная (инструментал), если isPlaying = true
    const tryToStartPlaybackAndSync = () => {
      const instrumentalReady = instrumentalAudio.readyState >= 3; // HAVE_FUTURE_DATA
      const vocalsReady =
        !vocalsAudio || !vocalsUrl || vocalsAudio.readyState >= 3;

      if (instrumentalReady && vocalsReady) {
        // Убедимся, что время синхронизировано ПЕРЕД началом воспроизведения
        if (
          (instrumentalChanged || vocalsChanged) &&
          vocalsAudio &&
          vocalsUrl
        ) {
          const diff = Math.abs(
            instrumentalAudio.currentTime - vocalsAudio.currentTime
          );
          if (diff > 0.1) {
            vocalsAudio.currentTime = instrumentalAudio.currentTime;
          }
        }

        // Если isPlaying true, пытаемся воспроизвести
        // (воспроизведение также управляется отдельным useEffect на isPlaying)
        if (isPlaying) {
          instrumentalAudio.play().catch((err) => {
            if (err.name !== "AbortError")
              console.warn("Instrumental play on canplaythrough:", err);
          });
          if (vocalsAudio && vocalsUrl) {
            vocalsAudio.play().catch((err) => {
              if (err.name !== "AbortError")
                console.warn("Vocals play on canplaythrough:", err);
            });
          }
        }
      }
    };

    // Добавляем слушатели на 'canplaythrough' для более надежной загрузки
    instrumentalAudio.addEventListener(
      "canplaythrough",
      tryToStartPlaybackAndSync,
      { once: true }
    );
    if (vocalsAudio) {
      vocalsAudio.addEventListener(
        "canplaythrough",
        tryToStartPlaybackAndSync,
        { once: true }
      );
    }

    // Если песня не изменилась и уже играла (например, изменили только громкость),
    // или если оба файла уже закешированы и готовы, запускаем сразу
    if (!instrumentalChanged && !vocalsChanged && isPlaying) {
      tryToStartPlaybackAndSync();
    }

    // Очистка при размонтировании или изменении зависимостей
    return () => {
      instrumentalAudio.removeEventListener(
        "canplaythrough",
        tryToStartPlaybackAndSync
      );
      if (vocalsAudio) {
        vocalsAudio.removeEventListener(
          "canplaythrough",
          tryToStartPlaybackAndSync
        );
      }
    };
  }, [
    currentSong,
    vocalsVolume,
    masterVolume,
    setCurrentTime,
    setDuration,
    isPlaying, // isPlaying вернул, чтобы этот эффект корректно реагировал на его изменение
  ]);

  // Эффект для управления воспроизведением/паузой (после того, как SRC уже установлен)
  useEffect(() => {
    const instrumentalAudio = instrumentalAudioRef.current;
    const vocalsAudio = vocalsAudioRef.current;

    if (!instrumentalAudio) return;

    if (isPlaying) {
      instrumentalAudio.play().catch((err) => {
        if (err.name !== "AbortError")
          console.warn("Instrumental playback error (toggle):", err);
      });
      if (vocalsAudio && currentSong?.vocalsUrl) {
        vocalsAudio.muted = false; // Убедимся, что не замьючено при старте
        vocalsAudio.play().catch((err) => {
          if (err.name !== "AbortError")
            console.warn("Vocals playback error (toggle):", err);
        });
      }
    } else {
      instrumentalAudio.pause();
      vocalsAudio?.pause();
    }
  }, [isPlaying, currentSong]); // currentSong добавлен для перепроверки vocalUrl при паузе/воспроизведении

  // Эффект для обработки завершения воспроизведения
  useEffect(() => {
    const instrumentalAudio = instrumentalAudioRef.current;
    const vocalsAudio = vocalsAudioRef.current;

    if (!instrumentalAudio) return;

    const handleEnded = () => {
      if (repeatMode === "one") {
        instrumentalAudio.currentTime = 0;
        if (vocalsAudio) vocalsAudio.currentTime = 0; // Сбрасываем время вокала тоже
        instrumentalAudio.play().catch((err) => {
          if (err.name !== "AbortError")
            console.warn("Instrumental play on repeat 'one':", err);
        });
        if (vocalsAudio && currentSong?.vocalsUrl) {
          // Проверяем, что вокал есть
          vocalsAudio.muted = false; // Убедимся, что вокал не замьючен при повторе
          vocalsAudio.play().catch((err) => {
            if (err.name !== "AbortError")
              console.warn("Vocals play on repeat 'one':", err);
          });
        }
      } else if (repeatMode === "all") {
        playNext();
      } else {
        usePlayerStore.setState({ isPlaying: false });
      }
    };

    instrumentalAudio.addEventListener("ended", handleEnded);

    return () => {
      instrumentalAudio.removeEventListener("ended", handleEnded);
    };
  }, [playNext, repeatMode, currentSong]);

  // Эффект для синхронизации currentTime и duration в PlayerStore
  useEffect(() => {
    const instrumentalAudio = instrumentalAudioRef.current;
    if (!instrumentalAudio) return;

    const updateCurrentTime = () => {
      usePlayerStore.setState({
        currentTime: Math.floor(instrumentalAudio.currentTime),
      });
    };

    const updateDuration = () => {
      if (instrumentalAudio.duration && isFinite(instrumentalAudio.duration)) {
        usePlayerStore.setState({
          duration: Math.floor(instrumentalAudio.duration),
        });
      }
    };

    // Объявляем функции-обработчики внутри эффекта, чтобы они всегда были актуальными
    // и не требовали дополнительных зависимостей.
    instrumentalAudio.addEventListener("timeupdate", updateCurrentTime);
    instrumentalAudio.addEventListener("loadedmetadata", updateDuration);
    instrumentalAudio.addEventListener("canplaythrough", updateDuration);

    // Функция очистки:
    return () => {
      instrumentalAudio.removeEventListener("timeupdate", updateCurrentTime);
      instrumentalAudio.removeEventListener("loadedmetadata", updateDuration);
      instrumentalAudio.removeEventListener("canplaythrough", updateDuration);
    };
  }, []); // Пустой массив зависимостей означает, что этот эффект запускается один раз при монтировании

  // Эффект для постоянной синхронизации currentTime вокала с инструменталом
  useEffect(() => {
    const instrumentalAudio = instrumentalAudioRef.current;
    const vocalsAudio = vocalsAudioRef.current;

    // Этот эффект должен работать только если обе дорожки существуют и есть vocalsUrl
    if (!instrumentalAudio || !vocalsAudio || !currentSong?.vocalsUrl) return;

    const handleTimeUpdate = () => {
      const diff = Math.abs(
        instrumentalAudio.currentTime - vocalsAudio.currentTime
      );
      if (diff > 0.1) {
        vocalsAudio.currentTime = instrumentalAudio.currentTime;
      }
    };

    const handleSeeking = () => {
      vocalsAudio.currentTime = instrumentalAudio.currentTime;
    };

    instrumentalAudio.addEventListener("timeupdate", handleTimeUpdate);
    instrumentalAudio.addEventListener("seeking", handleSeeking);

    // Функция очистки:
    return () => {
      instrumentalAudio.removeEventListener("timeupdate", handleTimeUpdate);
      instrumentalAudio.removeEventListener("seeking", handleSeeking);
    };
  }, [currentSong]); // currentSong здесь, чтобы пересоздавать слушатель, если песня меняется и vocalsUrl появляется/исчезает.

  return (
    <>
      <audio
        id="instrumental-audio-element"
        ref={instrumentalAudioRef}
        preload="auto"
      />
      {currentSong?.vocalsUrl && (
        <audio id="vocals-audio-element" ref={vocalsAudioRef} preload="auto" />
      )}
    </>
  );
};

export default AudioPlayer;
