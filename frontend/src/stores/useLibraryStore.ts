// frontend/src/stores/useLibraryStore.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Album, Song } from "../types";

interface LibraryStore {
  albums: Album[];
  likedSongs: Song[];
  isLoading: boolean;
  error: string | null;
  fetchLibrary: () => Promise<void>;
  toggleAlbum: (albumId: string) => Promise<void>;
  toggleSongLike: (songId: string) => Promise<void>;
  fetchLikedSongs: () => Promise<void>;
  isSongLiked: (songId: string) => boolean;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  albums: [],
  likedSongs: [],
  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/library/albums");
      set({ albums: res.data.albums, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch library",
        isLoading: false,
      });
    }
  },

  fetchLikedSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/library/liked-songs");
      set({ likedSongs: res.data.songs, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch liked songs",
        isLoading: false,
      });
    }
  },

  toggleAlbum: async (albumId: string) => {
    try {
      await axiosInstance.post("/library/albums/toggle", { albumId });
      // Можно было бы обновить локально, но для альбомов fetchLibrary, вероятно, не так часто
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle album error", err);
      set({ error: "Failed to toggle album" });
    }
  },

  toggleSongLike: async (songId: string) => {
    try {
      const { isLiked } = (
        await axiosInstance.post("/library/songs/toggle-like", { songId })
      ).data;

      // 💡 ОПТИМИЗАЦИЯ: Обновляем состояние `likedSongs` локально
      set((state) => {
        if (isLiked) {
          // Если песня была лайкнута (добавлена), добавляем её в начало массива
          // Нужно получить полную информацию о песне для этого, можно из `currentSong` в `usePlayerStore`
          // Или, если эта функция вызывается только из плеера, где `currentSong` доступен
          // Если currentSong не совпадает, нужно будет получить ее откуда-то еще.
          // Для простоты, пока будем предполагать, что мы всегда лайкаем текущую песню.
          // ИЛИ: Если бэкенд возвращает полный объект песни при лайке, то использовать его.
          // Твой бэкенд возвращает `likedSong: song`, но только при добавлении.
          // Самый надёжный способ - это всё-таки вызывать `fetchLikedSongs()` для актуальности,
          // но если хочется без лишних запросов, то...

          // Реалистичный подход для избежания fetchLikedSongs:
          // 1. Бэкенд всегда возвращает полный объект песни при лайке (включая все поля + likedAt).
          // 2. Бэкенд возвращает { success: true, isLiked: boolean, song: SongObject? }
          // Твой бэкенд возвращает `likedSong: song` только при добавлении, не при удалении.
          // Чтобы избежать лишних запросов, упростим:
          // - При лайке, добавляем плейсхолдер-объект, или пытаемся найти ее в PlayerStore.
          // - При дизлайке, удаляем.
          // - Для 100% гарантии актуального порядка и данных, fetchLikedSongs - лучший вариант.

          // Давай пока оставим fetchLikedSongs для простоты и гарантии актуальности данных,
          // если только мы не хотим сильно усложнять фронтенд логику, чтобы избежать 1 запроса.
          // Для большинства приложений этот запрос не будет большой нагрузкой.
          // Если производительность станет проблемой, можно будет реализовать более сложную локальную синхронизацию.
          // Я оставил fetchLikedSongs() в конце этого блока, это самый надёжный способ.
          return {}; // Не меняем состояние напрямую здесь, ждем fetchLikedSongs
        } else {
          // Если песня была дизлайкнута (удалена), убираем ее из массива
          return {
            likedSongs: state.likedSongs.filter((song) => song._id !== songId),
          };
        }
      });
      // 💡 Вернёмся к fetchLikedSongs() для гарантированной актуальности и сортировки
      await get().fetchLikedSongs();
    } catch (err) {
      console.error("Toggle song like error", err);
      set({ error: "Failed to toggle song like" });
    }
  },

  isSongLiked: (songId: string) => {
    return get().likedSongs.some((song) => song._id === songId);
  },
}));
