/* eslint-disable prefer-const */
// frontend/src/stores/usePlayerStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Song } from "../types";
import toast from "react-hot-toast"; // <-- 1. ИМПОРТ TOAST
import { useOfflineStore } from "./useOfflineStore"; // <-- 2. ИМПОРТ OFFLINE STORE

interface PlayerStore {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentIndex: number;
  repeatMode: "off" | "all" | "one";
  isShuffle: boolean;
  shuffleHistory: number[];
  shufflePointer: number;
  isFullScreenPlayerOpen: boolean;
  vocalsVolume: number;
  masterVolume: number;
  currentTime: number;
  duration: number;
  isDesktopLyricsOpen: boolean;
  isMobileLyricsFullScreen: boolean;
  dominantColor: string | null;
  setDominantColor: (color: string) => void;

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
  setIsDesktopLyricsOpen: (isOpen: boolean) => void;
  setIsMobileLyricsFullScreen: (isOpen: boolean) => void;
  seekToTime: (time: number) => void;
}

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
      isDesktopLyricsOpen: false,
      isMobileLyricsFullScreen: false,
      dominantColor: null,
      setDominantColor: (color: string) => set({ dominantColor: color }),

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
            currentTime: 0, // Сбрасываем время при смене трека
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

      // ===== ОБНОВЛЕННАЯ ФУНКЦИЯ playNext =====
      playNext: () => {
        const {
          queue,
          repeatMode,
          isShuffle,
          shuffleHistory,
          shufflePointer,
          currentIndex,
        } = get();
        const { isDownloaded } = useOfflineStore.getState().actions;
        const isOffline = useOfflineStore.getState().isOffline;

        if (queue.length === 0) return;
        if (repeatMode === "one") set({ repeatMode: "all" });

        let nextIndexInQueue = -1;
        let newShufflePointer = shufflePointer;
        let newShuffleHistory = [...shuffleHistory];

        if (isShuffle) {
          // --- Логика для SHUFFLE режима ---
          if (newShuffleHistory.length === 0 && queue.length > 0) {
            // Если история пуста, создаем ее
            newShuffleHistory = shuffleQueue(queue.length);
            const currentPos = newShuffleHistory.indexOf(currentIndex);
            if (currentPos !== -1) {
              [newShuffleHistory[0], newShuffleHistory[currentPos]] = [
                newShuffleHistory[currentPos],
                newShuffleHistory[0],
              ];
            }
            newShufflePointer = 0;
          }

          let checkedIndexes = 0; // Счетчик, чтобы избежать бесконечного цикла
          while (checkedIndexes < newShuffleHistory.length) {
            newShufflePointer++;
            if (newShufflePointer >= newShuffleHistory.length) {
              if (repeatMode === "all") {
                newShufflePointer = 0; // Начинаем заново
              } else {
                toast("End of queue.");
                set({ isPlaying: false });
                return;
              }
            }
            const potentialIndex = newShuffleHistory[newShufflePointer];
            if (!isOffline || isDownloaded(queue[potentialIndex]._id)) {
              nextIndexInQueue = potentialIndex;
              break; // Нашли подходящий трек
            }
            checkedIndexes++;
          }

          if (nextIndexInQueue === -1) {
            // Если после цикла ничего не нашли
            toast("No other downloaded songs in queue.");
            set({ isPlaying: false });
            return;
          }
        } else {
          // --- Логика для ОБЫЧНОГО режима ---
          let nextIndex = currentIndex;
          for (let i = 0; i < queue.length; i++) {
            nextIndex = (nextIndex + 1) % queue.length;
            const isLastSong = currentIndex === queue.length - 1 && i === 0;

            if (!isOffline || isDownloaded(queue[nextIndex]._id)) {
              nextIndexInQueue = nextIndex;
              break;
            }
            // Если дошли до конца и не нашли, проверяем repeat
            if (isLastSong && repeatMode !== "all") {
              toast("End of downloaded queue.");
              set({ isPlaying: false });
              return;
            }
          }
          if (nextIndexInQueue === -1) {
            // Если после цикла ничего не нашли
            toast("No other downloaded songs in queue.");
            set({ isPlaying: false });
            return;
          }
        }

        set({
          currentSong: queue[nextIndexInQueue],
          currentIndex: nextIndexInQueue,
          isPlaying: true,
          shuffleHistory: newShuffleHistory,
          shufflePointer: newShufflePointer,
          currentTime: 0,
        });
      },

      // ===== ОБНОВЛЕННАЯ ФУНКЦИЯ playPrevious =====
      playPrevious: () => {
        const {
          queue,
          repeatMode,
          isShuffle,
          shuffleHistory,
          shufflePointer,
          currentIndex,
        } = get();
        const { isDownloaded } = useOfflineStore.getState().actions;
        const isOffline = useOfflineStore.getState().isOffline;

        if (queue.length === 0) return;
        if (repeatMode === "one") set({ repeatMode: "all" });

        let prevIndexInQueue = -1;
        let newShufflePointer = shufflePointer;

        if (isShuffle) {
          // --- Логика для SHUFFLE режима ---
          let checkedIndexes = 0;
          while (checkedIndexes < shuffleHistory.length) {
            newShufflePointer--;
            if (newShufflePointer < 0) {
              if (repeatMode === "all") {
                newShufflePointer = shuffleHistory.length - 1;
              } else {
                toast("Start of queue.");
                set({ isPlaying: false });
                return;
              }
            }
            const potentialIndex = shuffleHistory[newShufflePointer];
            if (!isOffline || isDownloaded(queue[potentialIndex]._id)) {
              prevIndexInQueue = potentialIndex;
              break;
            }
            checkedIndexes++;
          }
          if (prevIndexInQueue === -1) {
            toast("No other downloaded songs in queue.");
            set({ isPlaying: false });
            return;
          }
        } else {
          // --- Логика для ОБЫЧНОГО режима ---
          let prevIndex = currentIndex;
          for (let i = 0; i < queue.length; i++) {
            prevIndex = (prevIndex - 1 + queue.length) % queue.length;
            const isFirstSong = currentIndex === 0 && i === 0;

            if (!isOffline || isDownloaded(queue[prevIndex]._id)) {
              prevIndexInQueue = prevIndex;
              break;
            }
            if (isFirstSong && repeatMode !== "all") {
              toast("Start of downloaded queue.");
              set({ isPlaying: false });
              return;
            }
          }
          if (prevIndexInQueue === -1) {
            toast("No other downloaded songs in queue.");
            set({ isPlaying: false });
            return;
          }
        }

        set({
          currentSong: queue[prevIndexInQueue],
          currentIndex: prevIndexInQueue,
          isPlaying: true,
          shufflePointer: newShufflePointer,
          currentTime: 0,
        });
      },

      setRepeatMode: (mode) => set({ repeatMode: mode }),
      setIsFullScreenPlayerOpen: (isOpen: boolean) =>
        set({ isFullScreenPlayerOpen: isOpen }),
      setVocalsVolume: (volume) => set({ vocalsVolume: volume }),
      setMasterVolume: (volume) => set({ masterVolume: volume }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration: duration }),
      setIsDesktopLyricsOpen: (isOpen) => set({ isDesktopLyricsOpen: isOpen }),
      setIsMobileLyricsFullScreen: (isOpen: boolean) => {
        console.log("Setting isMobileLyricsFullScreen to:", isOpen);
        set({ isMobileLyricsFullScreen: isOpen });
      },
      seekToTime: (time: number) => {
        set((state) => {
          const newTime = Math.max(0, Math.min(time, state.duration));
          return { currentTime: newTime, isPlaying: true };
        });
      },
    }),
    {
      name: "music-player-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSong: state.currentSong
          ? {
              ...state.currentSong,
              lyrics: state.currentSong.lyrics,
            }
          : null,
        isPlaying: state.isPlaying,
        queue: state.queue.map((song) => ({
          ...song,
          lyrics: song.lyrics,
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
            persistedState.isPlaying = false;
            persistedState.isFullScreenPlayerOpen = false;
            persistedState.currentTime = 0;
          }
        };
      },
    }
  )
);
