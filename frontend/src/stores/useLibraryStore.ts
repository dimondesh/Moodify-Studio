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
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  albums: [],
  likedSongs: [],
  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      // 💡 Убираем withCredentials, так как Axios Interceptor уже обрабатывает заголовки
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
      // 💡 Убираем withCredentials
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
      // 💡 Убираем withCredentials
      await axiosInstance.post("/library/albums/toggle", { albumId });
      // После успешного тоггла, обновляем библиотеку
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle album error", err);
      set({ error: "Failed to toggle album" }); // Добавим ошибку в стор
    }
  },

  toggleSongLike: async (songId: string) => {
    try {
      // 💡 Убираем withCredentials
      await axiosInstance.post("/library/songs/toggle-like", { songId }); // 💡 Исправлен путь с "/songs/toggle-like"
      // После успешного тоггла, обновляем лайкнутые песни
      await get().fetchLikedSongs();
    } catch (err) {
      console.error("Toggle song like error", err);
      set({ error: "Failed to toggle song like" }); // Добавим ошибку в стор
    }
  },
}));
