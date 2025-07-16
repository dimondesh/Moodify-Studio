/* eslint-disable prefer-const */
// frontend/src/stores/usePlayerStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Song } from "../types";

interface PlayerStore {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[]; // Оригинальная очередь
  currentIndex: number; // Индекс в оригинальной очереди
  repeatMode: "off" | "all" | "one";
  isShuffle: boolean;
  shuffleHistory: number[]; // История индексов из оригинальной очереди
  shufflePointer: number; // Указатель на текущий индекс в shuffleHistory
  isFullScreenPlayerOpen: boolean;
  vocalsVolume: number;
  masterVolume: number;
  currentTime: number;
  duration: number;
  isDesktopLyricsOpen: boolean; // <-- НОВОЕ: Для десктопной страницы текстов
  isMobileLyricsFullScreen: boolean; // <-- НОВОЕ: Для полноэкранных текстов на мобильном

  setRepeatMode: (mode: "off" | "all" | "one") => void;
  toggleShuffle: () => void;
  initializeQueue: (songs: Song[]) => void;
  playAlbum: (songs: Song[], startIndex?: number) => void;
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setIsFullScreenPlayerOpen: (isOpen: boolean) => void;
  setVocalsVolume: (volume: number) => void;
  setMasterVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsDesktopLyricsOpen: (isOpen: boolean) => void; // <-- НОВОЕ действие
  setIsMobileLyricsFullScreen: (isOpen: boolean) => void; // <-- НОВОЕ действие
}

// Вспомогательная функция для перемешивания массива индексов
const shuffleQueue = (length: number) => {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      queue: [],
      currentIndex: -1,
      repeatMode: "off",
      isShuffle: false,
      shuffleHistory: [],
      shufflePointer: -1,
      isFullScreenPlayerOpen: false,
      vocalsVolume: 100,
      masterVolume: 75,
      currentTime: 0,
      duration: 0,
      isDesktopLyricsOpen: false, // Инициализация
      isMobileLyricsFullScreen: false, // Инициализация

      initializeQueue: (songs: Song[]) => {
        set((state) => {
          const newQueue = songs;
          const currentSong =
            state.currentSong &&
            newQueue.some((s) => s._id === state.currentSong!._id)
              ? state.currentSong
              : newQueue.length > 0
              ? newQueue[0]
              : null;

          const currentIndex = currentSong
            ? newQueue.findIndex((s) => s._id === currentSong._id)
            : -1;

          let newShuffleHistory = state.shuffleHistory;
          let newShufflePointer = state.shufflePointer;

          if (state.isShuffle && newQueue.length > 0) {
            newShuffleHistory = shuffleQueue(newQueue.length);
            if (currentSong && currentIndex !== -1) {
              const currentPosInShuffle =
                newShuffleHistory.indexOf(currentIndex);
              if (currentPosInShuffle !== -1) {
                [newShuffleHistory[0], newShuffleHistory[currentPosInShuffle]] =
                  [
                    newShuffleHistory[currentPosInShuffle],
                    newShuffleHistory[0],
                  ];
              } else {
                newShuffleHistory.unshift(currentIndex);
                newShuffleHistory.pop();
              }
              newShufflePointer = 0;
            } else {
              newShufflePointer = -1;
            }
          } else {
            newShuffleHistory = [];
            newShufflePointer = -1;
          }

          return {
            queue: newQueue,
            currentSong: currentSong,
            currentIndex: currentIndex,
            shuffleHistory: newShuffleHistory,
            shufflePointer: newShufflePointer,
          };
        });
      },

      playAlbum: (songs: Song[], startIndex = 0) => {
        if (songs.length === 0) {
          set({
            currentSong: null,
            isPlaying: false,
            queue: [],
            currentIndex: -1,
            shuffleHistory: [],
            shufflePointer: -1,
          });
          return;
        }

        set((state) => {
          const isShuffle = state.isShuffle;
          let songToPlay: Song;
          let targetIndexInQueue: number;
          let newShuffleHistory: number[] = [];
          let newShufflePointer: number = -1;

          if (isShuffle) {
            newShuffleHistory = shuffleQueue(songs.length);
            const currentPosInShuffle = newShuffleHistory.indexOf(startIndex);
            if (currentPosInShuffle !== -1) {
              [newShuffleHistory[0], newShuffleHistory[currentPosInShuffle]] = [
                newShuffleHistory[currentPosInShuffle],
                newShuffleHistory[0],
              ];
            } else {
              newShuffleHistory.unshift(startIndex);
              newShuffleHistory.pop();
            }
            newShufflePointer = 0;
            targetIndexInQueue = newShuffleHistory[newShufflePointer];
            songToPlay = songs[targetIndexInQueue];
          } else {
            targetIndexInQueue = startIndex;
            songToPlay = songs[targetIndexInQueue];
            newShuffleHistory = [];
            newShufflePointer = -1;
          }

          const newState = {
            queue: songs,
            isPlaying: true,
            currentSong: songToPlay,
            currentIndex: targetIndexInQueue,
            shuffleHistory: newShuffleHistory,
            shufflePointer: newShufflePointer,
          };
          set(newState);

          return newState;
        });
      },

      setCurrentSong: (song: Song | null) => {
        if (!song) {
          set({
            currentSong: null,
            isPlaying: false,
            currentIndex: -1,
            currentTime: 0,
            duration: 0,
          });
          return;
        }

        set((state) => {
          const songIndex = state.queue.findIndex((s) => s._id === song._id);
          let newShufflePointer = state.shufflePointer;
          let newShuffleHistory = state.shuffleHistory;

          if (state.isShuffle) {
            if (songIndex !== -1) {
              newShuffleHistory = shuffleQueue(state.queue.length);
              const currentPos = newShuffleHistory.indexOf(songIndex);
              if (currentPos !== -1) {
                [newShuffleHistory[0], newShuffleHistory[currentPos]] = [
                  newShuffleHistory[currentPos],
                  newShuffleHistory[0],
                ];
              } else {
                newShuffleHistory.unshift(songIndex);
                newShuffleHistory.pop();
              }
              newShufflePointer = 0;
            } else {
              newShuffleHistory = [];
              newShufflePointer = -1;
            }
          }

          const newState = {
            currentSong: song,
            isPlaying: true,
            currentIndex: songIndex !== -1 ? songIndex : state.currentIndex,
            shuffleHistory: newShuffleHistory,
            shufflePointer: newShufflePointer,
          };
          set(newState);

          return newState;
        });
      },

      togglePlay: () => {
        set((state) => ({ isPlaying: !state.isPlaying }));
      },

      toggleShuffle: () => {
        set((state) => {
          const newShuffleMode = !state.isShuffle;
          if (!newShuffleMode) {
            return {
              isShuffle: false,
              shuffleHistory: [],
              shufflePointer: -1,
            };
          } else {
            const queueLength = state.queue.length;
            if (queueLength === 0) {
              return {
                isShuffle: true,
                shuffleHistory: [],
                shufflePointer: -1,
              };
            }

            const newShuffleHistory = shuffleQueue(queueLength);
            const currentIndex = state.currentIndex;

            if (currentIndex !== -1) {
              const currentPosInShuffle =
                newShuffleHistory.indexOf(currentIndex);
              if (currentPosInShuffle !== -1) {
                [newShuffleHistory[0], newShuffleHistory[currentPosInShuffle]] =
                  [
                    newShuffleHistory[currentPosInShuffle],
                    newShuffleHistory[0],
                  ];
              } else {
                newShuffleHistory.unshift(currentIndex);
                newShuffleHistory.pop();
              }
            }
            return {
              isShuffle: true,
              shuffleHistory: newShuffleHistory,
              shufflePointer: currentIndex !== -1 ? 0 : -1,
            };
          }
        });
      },

      playNext: () => {
        const {
          currentIndex,
          queue,
          repeatMode,
          isShuffle,
          shuffleHistory,
          shufflePointer,
        } = get();

        if (queue.length === 0) {
          set({ isPlaying: false });
          return;
        }

        if (repeatMode === "one") {
          set({ repeatMode: "all" });
        }

        let nextIndexInQueue: number;
        let newShufflePointer: number = shufflePointer;
        let newShuffleHistory: number[] = [...shuffleHistory];

        if (isShuffle) {
          if (newShuffleHistory.length === 0) {
            newShuffleHistory = shuffleQueue(queue.length);
            const currentSongQueueIndex = queue.findIndex(
              (s) => s._id === get().currentSong?._id
            );
            if (currentSongQueueIndex !== -1) {
              const currentPosInShuffle = newShuffleHistory.indexOf(
                currentSongQueueIndex
              );
              if (currentPosInShuffle !== -1) {
                [newShuffleHistory[0], newShuffleHistory[currentPosInShuffle]] =
                  [
                    newShuffleHistory[currentPosInShuffle],
                    newShuffleHistory[0],
                  ];
              } else {
                newShuffleHistory.unshift(currentSongQueueIndex);
                newShuffleHistory.pop();
              }
              newShufflePointer = 0;
            } else {
              newShufflePointer = 0;
            }
          }

          if (newShufflePointer < newShuffleHistory.length - 1) {
            newShufflePointer++;
            nextIndexInQueue = newShuffleHistory[newShufflePointer];
          } else {
            if (repeatMode === "all") {
              newShuffleHistory = shuffleQueue(queue.length);
              newShufflePointer = 0;
              nextIndexInQueue = newShuffleHistory[newShufflePointer];
            } else {
              set({ isPlaying: false });
              return;
            }
          }
        } else {
          let potentialNextIndex = currentIndex + 1;
          if (potentialNextIndex >= queue.length) {
            if (repeatMode === "all") {
              nextIndexInQueue = 0;
            } else {
              set({ isPlaying: false });
              return;
            }
          } else {
            nextIndexInQueue = potentialNextIndex;
          }
        }

        const nextSong = queue[nextIndexInQueue];
        set({
          currentSong: nextSong,
          currentIndex: nextIndexInQueue,
          isPlaying: true,
          shuffleHistory: newShuffleHistory,
          shufflePointer: newShufflePointer,
        });
      },

      playPrevious: () => {
        const {
          currentIndex,
          queue,
          repeatMode,
          isShuffle,
          shuffleHistory,
          shufflePointer,
        } = get();

        if (queue.length === 0) {
          set({ isPlaying: false });
          return;
        }

        if (repeatMode === "one") {
          set({ repeatMode: "all" });
        }

        let prevIndexInQueue: number;
        let newShufflePointer: number = shufflePointer;

        if (isShuffle) {
          if (newShufflePointer > 0) {
            newShufflePointer--;
            prevIndexInQueue = shuffleHistory[newShufflePointer];
          } else {
            if (repeatMode === "all" && shuffleHistory.length > 0) {
              newShufflePointer = shuffleHistory.length - 1;
              prevIndexInQueue = shuffleHistory[newShufflePointer];
            } else {
              set({ isPlaying: false });
              return;
            }
          }
        } else {
          let potentialPrevIndex = currentIndex - 1;
          if (potentialPrevIndex < 0) {
            if (repeatMode === "all") {
              prevIndexInQueue = queue.length - 1;
            } else {
              set({ isPlaying: false });
              return;
            }
          } else {
            prevIndexInQueue = potentialPrevIndex;
          }
        }

        const prevSong = queue[prevIndexInQueue];
        set({
          currentSong: prevSong,
          currentIndex: prevIndexInQueue,
          isPlaying: true,
          shufflePointer: newShufflePointer,
        });
      },

      setRepeatMode: (mode) => set({ repeatMode: mode }),
      setIsFullScreenPlayerOpen: (isOpen: boolean) =>
        set({ isFullScreenPlayerOpen: isOpen }),
      setVocalsVolume: (volume) => set({ vocalsVolume: volume }),
      setMasterVolume: (volume) => set({ masterVolume: volume }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration: duration }),
      setIsDesktopLyricsOpen: (isOpen) => set({ isDesktopLyricsOpen: isOpen }), // <-- НОВОЕ действие
      setIsMobileLyricsFullScreen: (isOpen: boolean) => {
        console.log("Setting isMobileLyricsFullScreen to:", isOpen);
        set({ isMobileLyricsFullScreen: isOpen });
      },
    }),

    {
      name: "music-player-storage",
      storage: createJSONStorage(() => localStorage),
      // --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Убираем дублирование currentSong и queue ---
      partialize: (state) => ({
        currentSong: state.currentSong
          ? {
              ...state.currentSong,
              lyrics: state.currentSong.lyrics, // Убеждаемся, что lyrics сохраняется
            }
          : null,
        isPlaying: state.isPlaying,
        queue: state.queue.map((song) => ({
          ...song,
          lyrics: song.lyrics, // Убеждаемся, что lyrics сохраняется для каждой песни в очереди
        })),
        currentIndex: state.currentIndex,
        repeatMode: state.repeatMode,
        isShuffle: state.isShuffle,
        shuffleHistory: state.shuffleHistory,
        shufflePointer: state.shufflePointer,
        vocalsVolume: state.vocalsVolume,
        masterVolume: state.masterVolume,
      }),
      onRehydrateStorage: () => {
        return (persistedState, error) => {
          if (error) {
            console.log("an error happened during rehydration", error);
          }
          if (persistedState) {
            persistedState.currentSong = null;
            persistedState.isPlaying = false;
            persistedState.isFullScreenPlayerOpen = false;
            persistedState.currentTime = 0;
            persistedState.duration = 0;
          }
        };
      },
    }
  )
);
