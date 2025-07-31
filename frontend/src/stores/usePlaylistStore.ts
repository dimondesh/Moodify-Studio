/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "@/lib/axios"; // Используем абсолютный импорт
import type { Playlist } from "@/types"; // Используем абсолютный импорт
import toast from "react-hot-toast"; // Импорт react-hot-toast
import { useOfflineStore } from "./useOfflineStore"; // <-- 1. ИМПОРТИРУЕМ ОФЛАЙН-СТОР
import { getItem } from "@/lib/offline-db"; // <-- 2. ИМПОРТИРУЕМ ФУНКЦИЮ ДЛЯ ЧТЕНИЯ ИЗ БД

interface PlaylistStore {
  myPlaylists: Playlist[];
  publicPlaylists: Playlist[];
  currentPlaylist: Playlist | null;
  isLoading: boolean;
  error: string | null;
  dominantColor: string | null;
  setDominantColor: (color: string) => void;

  fetchMyPlaylists: () => Promise<void>;
  fetchPublicPlaylists: () => Promise<void>;
  fetchPlaylistById: (id: string) => Promise<void>;
  createPlaylist: (
    title: string,
    description: string,
    isPublic: boolean,
    imageFile?: File | null
  ) => Promise<Playlist | undefined>;
  updatePlaylist: (
    id: string,
    title: string,
    description: string,
    isPublic: boolean,
    imageFile?: File | null
  ) => Promise<Playlist | undefined>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;

  // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
  // Функция для добавления/удаления плейлиста в/из ЛИЧНОЙ БИБЛИОТЕКИ
  togglePlaylistInUserLibrary: (playlistId: string) => Promise<void>;
  // Функции для управления ЛАЙКАМИ ПОПУЛЯРНОСТИ на самом плейлисте
  addPlaylistLike: (playlistId: string) => Promise<void>;
  removePlaylistLike: (playlistId: string) => Promise<void>;
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---

  resetCurrentPlaylist: () => void; // Для очистки текущего плейлиста при уходе со страницы
  fetchPlaylistDetails: (playlistId: string) => Promise<void>; // ИСПРАВЛЕНО
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  myPlaylists: [],
  publicPlaylists: [],
  currentPlaylist: null,
  isLoading: false,
  error: null,
  dominantColor: null, // <--- новое поле
  setDominantColor: (color: string) => set({ dominantColor: color }), // <--

  fetchMyPlaylists: async () => {
    if (useOfflineStore.getState().isOffline) return; // ЗАЩИТА

    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/playlists/my");
      set({ myPlaylists: response.data, isLoading: false });
    } catch (err: any) {
      console.error("Failed to fetch my playlists:", err);
      set({
        error: err.response?.data?.message || "Failed to fetch my playlists",
        isLoading: false,
      });
      toast.error("Failed to load your playlists.");
    }
  },

  fetchPublicPlaylists: async () => {
    if (useOfflineStore.getState().isOffline) return; // ЗАЩИТА

    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/playlists/public");
      set({ publicPlaylists: response.data, isLoading: false });
    } catch (err: any) {
      console.error("Failed to fetch public playlists:", err);
      set({
        error:
          err.response?.data?.message || "Failed to fetch public playlists",
        isLoading: false,
      });
      toast.error("Failed to load public playlists.");
    }
  },

  fetchPlaylistById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/playlists/${id}`);
      set({ currentPlaylist: response.data, isLoading: false });
    } catch (err: any) {
      console.error(`Failed to fetch playlist by ID ${id}:`, err);
      set({
        error:
          err.response?.data?.message ||
          `Failed to fetch playlist with ID ${id}`,
        isLoading: false,
      });
      toast.error(`Failed to load playlist.`);
    }
  },

  createPlaylist: async (title, description, isPublic, imageFile) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("isPublic", String(isPublic));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await axiosInstance.post("/playlists", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      get().fetchMyPlaylists(); // Обновить список плейлистов после создания
      set({ isLoading: false });
      return response.data;
    } catch (err: any) {
      console.error("Failed to create playlist:", err);
      set({
        error: err.response?.data?.message || "Failed to create playlist",
        isLoading: false,
      });
      return undefined;
    }
  },

  updatePlaylist: async (id, title, description, isPublic, imageFile) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("isPublic", String(isPublic));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await axiosInstance.put(`/playlists/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      get().fetchMyPlaylists(); // Обновить список плейлистов после обновления
      set({ isLoading: false });
      return response.data;
    } catch (err: any) {
      console.error("Failed to update playlist:", err);
      set({
        error: err.response?.data?.message || "Failed to update playlist",
        isLoading: false,
      });
      return undefined;
    }
  },

  deletePlaylist: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/playlists/${id}`);
      get().fetchMyPlaylists(); // Обновить список плейлистов после удаления
      set({ isLoading: false });
    } catch (err: any) {
      console.error("Failed to delete playlist:", err);
      set({
        error: err.response?.data?.message || "Failed to delete playlist",
        isLoading: false,
      });
    }
  },

  addSongToPlaylist: async (playlistId: string, songId: string) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.post(`/playlists/${playlistId}/songs`, { songId });
      get().fetchPlaylistDetails(playlistId); // Обновляем детали текущего плейлиста
      set({ isLoading: false });
    } catch (err: any) {
      console.error("Failed to add song to playlist:", err);
      set({
        error: err.response?.data?.message || "Failed to add song to playlist",
        isLoading: false,
      });
    }
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/playlists/${playlistId}/songs/${songId}`);
      get().fetchPlaylistDetails(playlistId); // Обновляем детали текущего плейлиста
      set({ isLoading: false });
    } catch (err: any) {
      console.error("Failed to remove song from playlist:", err);
      set({
        error:
          err.response?.data?.message || "Failed to remove song from playlist",
        isLoading: false,
      });
    }
  },

  // --- ОБНОВЛЕННЫЕ ФУНКЦИИ ---

  // Новая функция для добавления/удаления плейлиста из ЛИЧНОЙ БИБЛИОТЕКИ пользователя.
  // Эта функция должна быть вызвана кнопкой "добавить в библиотеку" / "сохранить".
  togglePlaylistInUserLibrary: async (playlistId: string) => {
    try {
      const response = await axiosInstance.post(
        `/api/library/playlists/toggle`,
        { playlistId }
      );
      const { isAdded, message } = response.data;

      toast.success(
        message ||
          (isAdded
            ? "Playlist added to library!"
            : "Playlist removed from library!")
      );
      // ОЧЕНЬ ВАЖНО: После изменения библиотеки, обновляем список 'myPlaylists'
      // так как он теперь включает элементы из библиотеки.
      get().fetchMyPlaylists();
    } catch (err: any) {
      console.error("Failed to toggle playlist in library:", err);
      set({
        error:
          err.response?.data?.message || "Failed to toggle playlist in library",
      });
      toast.error("Failed to toggle playlist in library.");
    }
  },

  // Новая функция для увеличения счетчика ЛАЙКОВ ПОПУЛЯРНОСТИ на плейлисте.
  // Это отдельная метрика от добавления в библиотеку.
  addPlaylistLike: async (playlistId: string) => {
    try {
      await axiosInstance.post(`/playlists/${playlistId}/like`);
      toast.success("Playlist liked!");
      // Возможно, потребуется обновить `currentPlaylist` или `publicPlaylists`
      // чтобы увидеть изменения в количестве лайков на фронтенде.
      get().fetchPlaylistDetails(playlistId); // Обновить детали текущего плейлиста, если лайк поставлен на открытом плейлисте
      get().fetchPublicPlaylists(); // Обновить публичные плейлисты, чтобы обновилось количество лайков
    } catch (err: any) {
      console.error("Failed to like playlist:", err);
      set({ error: err.response?.data?.message || "Failed to like playlist" });
      toast.error("Failed to like playlist.");
    }
  },

  // Новая функция для уменьшения счетчика ЛАЙКОВ ПОПУЛЯРНОСТИ на плейлисте.
  removePlaylistLike: async (playlistId: string) => {
    try {
      await axiosInstance.delete(`/playlists/${playlistId}/unlike`); // Используем /unlike как в вашем router.delete
      toast.success("Playlist unliked!");
      get().fetchPlaylistDetails(playlistId); // Обновить детали текущего плейлиста
      get().fetchPublicPlaylists(); // Обновить публичные плейлисты
    } catch (err: any) {
      console.error("Failed to unlike playlist:", err);
      set({
        error: err.response?.data?.message || "Failed to unlike playlist",
      });
      toast.error("Failed to unlike playlist.");
    }
  },

  // --- КОНЕЦ ОБНОВЛЕННЫХ ФУНКЦИЙ ---

  resetCurrentPlaylist: () => set({ currentPlaylist: null }),

  fetchPlaylistDetails: async (playlistId: string) => {
    set({ currentPlaylist: null, error: null, isLoading: true });
    const { isOffline } = useOfflineStore.getState();
    const { isDownloaded } = useOfflineStore.getState().actions;
    if (isDownloaded(playlistId)) {
      console.log(`[Offline] Загрузка плейлиста ${playlistId} из IndexedDB.`);
      const localPlaylist = await getItem("playlists", playlistId);
      if (localPlaylist) {
        set({ currentPlaylist: localPlaylist, isLoading: false });
        return;
      }
    }

    if (isOffline) {
      console.log(`[Offline] Нет сети и плейлист ${playlistId} не скачан.`);
      const errorMsg = "Этот плейлист не скачан и недоступен в офлайн-режиме.";
      set({ currentPlaylist: null, error: errorMsg, isLoading: false });
      toast.error(errorMsg);
      return;
    }
    try {
      const res = await axiosInstance.get(`/playlists/${playlistId}`);
      set({ currentPlaylist: res.data, isLoading: false });
    } catch (e: any) {
      console.error(`Failed to fetch playlist with ID ${playlistId}:`, e);
      set({
        currentPlaylist: null,
        error: e.response?.data?.message || "Failed to fetch playlist details",
        isLoading: false,
      });
      toast.error(`Failed to load playlist details.`);
    }
  },
}));
