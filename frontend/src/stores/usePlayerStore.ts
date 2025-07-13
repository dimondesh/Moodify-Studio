// frontend/src/stores/usePlayerStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Song } from "../types";
import { usePlayCountStore } from "./usePlayCountStore";

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
  vocalsVolume: number; // Громкость вокала (0-100), относительная
  masterVolume: number; // Общая громкость (0-100)
  currentTime: number; // <-- НОВОЕ ПОЛЕ: Текущее время воспроизведения
  duration: number; // <-- НОВОЕ ПОЛЕ: Общая длительность трека

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
  setCurrentTime: (time: number) => void; // <-- НОВАЯ ФУНКЦИЯ
  setDuration: (duration: number) => void; // <-- НОВАЯ ФУНКЦИЯ
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
      currentTime: 0, // <-- Инициализация
      duration: 0, // <-- Инициализация

      initializeQueue: (songs: Song[]) => {
        set({
          queue: songs,
          currentSong: get().currentSong || songs[0],
          currentIndex: get().currentIndex === -1 ? 0 : get().currentIndex,
          shuffleHistory: [],
          shufflePointer: -1,
          currentTime: 0, // Сброс
          duration: 0, // Сброс
        });
      },

      playAlbum: (songs: Song[], startIndex = 0) => {
        if (songs.length === 0) return;

        const isShuffle = get().isShuffle;
        let songToPlay: Song;
        let targetIndex: number;

        if (isShuffle) {
          const newShuffleHistory = shuffleQueue(songs.length);
          const currentIndex = startIndex;
          const currentPosInShuffle = newShuffleHistory.indexOf(currentIndex);

          if (currentPosInShuffle !== -1) {
            [newShuffleHistory[0], newShuffleHistory[currentPosInShuffle]] = [
              newShuffleHistory[currentPosInShuffle],
              newShuffleHistory[0],
            ];
          } else {
            newShuffleHistory.unshift(currentIndex);
            newShuffleHistory.pop();
          }

          targetIndex = newShuffleHistory[0];
          songToPlay = songs[targetIndex];

          set({
            queue: songs,
            isPlaying: true,
            shuffleHistory: newShuffleHistory,
            shufflePointer: 0,
            currentTime: 0, // Сброс
            duration: 0, // Сброс
          });
        } else {
          targetIndex = startIndex;
          songToPlay = songs[targetIndex];

          set({
            queue: songs,
            isPlaying: true,
            shuffleHistory: [],
            shufflePointer: -1,
            currentTime: 0, // Сброс
            duration: 0, // Сброс
          });
        }

        set({
          currentSong: songToPlay,
          currentIndex: targetIndex,
          isPlaying: true,
        });
        usePlayCountStore.getState().incrementPlayCount(songToPlay._id);
      },

      setCurrentSong: (song: Song | null) => {
        if (!song) return;

        const songIndex = get().queue.findIndex((s) => s._id === song._id);

        set({
          currentSong: song,
          isPlaying: true,
          currentIndex: songIndex !== -1 ? songIndex : get().currentIndex,
          currentTime: 0, // Сброс
          duration: 0, // Сброс
        });
        usePlayCountStore.getState().incrementPlayCount(song._id);
      },

      togglePlay: () => {
        const willStartPlaying = !get().isPlaying;
        set({
          isPlaying: willStartPlaying,
        });
      },

      toggleShuffle: () => {
        set((state) => {
          if (state.isShuffle) {
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
            const currentIndex =
              state.currentIndex >= 0 ? state.currentIndex : 0;
            const currentPosInShuffle = newShuffleHistory.indexOf(currentIndex);

            if (currentPosInShuffle !== -1) {
              [newShuffleHistory[0], newShuffleHistory[currentPosInShuffle]] = [
                newShuffleHistory[currentPosInShuffle],
                newShuffleHistory[0],
              ];
            } else {
              newShuffleHistory.unshift(currentIndex);
              newShuffleHistory.pop();
            }

            return {
              isShuffle: true,
              shuffleHistory: newShuffleHistory,
              shufflePointer: 0,
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

        if (repeatMode === "one") {
          set({ repeatMode: "all" }); // Это действие вызовет перезапуск трека в AudioPlayer
        }

        if (isShuffle) {
          if (shufflePointer < shuffleHistory.length - 1) {
            const nextPointer = shufflePointer + 1;
            const nextIndex = shuffleHistory[nextPointer];
            const nextSong = queue[nextIndex];
            set({
              currentSong: nextSong,
              currentIndex: nextIndex,
              isPlaying: true,
              currentTime: 0, // Сброс
              duration: 0, // Сброс
            });
            usePlayCountStore.getState().incrementPlayCount(nextSong._id);
          } else {
            if (repeatMode === "off") {
              set({ isPlaying: false, currentTime: 0, duration: 0 }); // Сброс
            } else {
              const newShuffleHistory = shuffleQueue(queue.length);
              const firstIndex = newShuffleHistory[0];
              const firstSong = queue[firstIndex];
              set({
                currentSong: firstSong,
                currentIndex: firstIndex,
                isPlaying: true,
                shuffleHistory: newShuffleHistory,
                shufflePointer: 0,
                currentTime: 0, // Сброс
                duration: 0, // Сброс
              });
              usePlayCountStore.getState().incrementPlayCount(firstSong._id);
            }
          }
        } else {
          let nextIndex = currentIndex + 1;
          if (nextIndex >= queue.length) {
            if (repeatMode === "all") {
              nextIndex = 0;
            } else {
              set({ isPlaying: false, currentTime: 0, duration: 0 }); // Сброс
              return;
            }
          }

          const nextSong = queue[nextIndex];
          set({
            currentSong: nextSong,
            currentIndex: nextIndex,
            isPlaying: true,
            currentTime: 0, // Сброс
            duration: 0, // Сброс
          });
          usePlayCountStore.getState().incrementPlayCount(nextSong._id);
        }
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

        if (repeatMode === "one") {
          set({ repeatMode: "all" }); // Это действие вызовет перезапуск трека в AudioPlayer
        }

        if (isShuffle) {
          if (shufflePointer > 0) {
            const prevPointer = shufflePointer - 1;
            const prevIndex = shuffleHistory[prevPointer];
            const prevSong = queue[prevIndex];
            set({
              currentSong: prevSong,
              currentIndex: prevIndex,
              isPlaying: true,
              shufflePointer: prevPointer,
              currentTime: 0, // Сброс
              duration: 0, // Сброс
            });
            usePlayCountStore.getState().incrementPlayCount(prevSong._id);
          } else {
            set({ isPlaying: false, currentTime: 0, duration: 0 }); // Сброс
          }
        } else {
          let prevIndex = currentIndex - 1;
          if (prevIndex < 0) {
            if (repeatMode === "all") {
              prevIndex = queue.length - 1;
            } else {
              set({ isPlaying: false, currentTime: 0, duration: 0 }); // Сброс
              return;
            }
          }

          const prevSong = queue[prevIndex];
          set({
            currentSong: prevSong,
            currentIndex: prevIndex,
            isPlaying: true,
            currentTime: 0, // Сброс
            duration: 0, // Сброс
          });
          usePlayCountStore.getState().incrementPlayCount(prevSong._id);
        }
      },

      setRepeatMode: (mode) => set({ repeatMode: mode }),
      setIsFullScreenPlayerOpen: (isOpen: boolean) =>
        set({ isFullScreenPlayerOpen: isOpen }),
      setVocalsVolume: (volume) => set({ vocalsVolume: volume }),
      setMasterVolume: (volume) => set({ masterVolume: volume }),
      setCurrentTime: (time) => set({ currentTime: time }), // Реализация
      setDuration: (duration) => set({ duration: duration }), // Реализация
    }),
    {
      name: "music-player-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSong: state.currentSong,
        isPlaying: state.isPlaying,
        queue: state.queue,
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
            // При перезагрузке сбрасываем состояние воспроизведения
            persistedState.currentSong = null;
            persistedState.isPlaying = false;
            persistedState.isFullScreenPlayerOpen = false;
            persistedState.currentTime = 0; // Сбрасываем и время
            persistedState.duration = 0; // Сбрасываем и длительность
          }
        };
      },
    }
  )
);
