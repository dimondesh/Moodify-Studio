/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "@/lib/axios"; // Используем абсолютный импорт
import type { Playlist } from "@/types"; // Используем абсолютный импорт
import toast from "react-hot-toast"; // Импорт react-hot-toast

interface PlaylistStore {
  myPlaylists: Playlist[];
  publicPlaylists: Playlist[];
  currentPlaylist: Playlist | null;
  isLoading: boolean;
  error: string | null;

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

  fetchMyPlaylists: async () => {
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
