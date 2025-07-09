/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Album, Song, LibraryPlaylist } from "../types"; // Импортируем Playlist

interface LibraryStore {
  albums: Album[];
  likedSongs: Song[];
  playlists: LibraryPlaylist[]; // <-- НОВОЕ: Добавляем массив плейлистов в библиотеке
  isLoading: boolean;
  error: string | null;
  fetchLibrary: () => Promise<void>; // Переименуем, чтобы она получала все элементы библиотеки
  fetchLikedSongs: () => Promise<void>; // Оставляем для лайкнутых песен
  toggleAlbum: (albumId: string) => Promise<void>;
  toggleSongLike: (songId: string) => Promise<void>;
  // НОВОЕ: Функция для добавления/удаления плейлиста из библиотеки
  togglePlaylist: (playlistId: string) => Promise<void>;
  isSongLiked: (songId: string) => boolean;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  albums: [],
  likedSongs: [],
  playlists: [], // <-- Инициализируем
  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log("useLibraryStore: Attempting to fetch library data..."); // Лог 6

      // Предполагаем, что /library/all возвращает все элементы библиотеки
      // Или, если у вас отдельные эндпоинты, вызывайте их здесь
      const [albumsRes, likedSongsRes, playlistsRes] = await Promise.all([
        axiosInstance.get("/library/albums"),
        axiosInstance.get("/library/liked-songs"),
        axiosInstance.get("/library/playlists"),
      ]);

      set({
        albums: albumsRes.data.albums || [],
        likedSongs: likedSongsRes.data.songs || [],
        playlists: playlistsRes.data.playlists || [], // <-- Устанавливаем плейлисты
        isLoading: false,
      });
      console.log("useLibraryStore: Library data fetched successfully."); // Лог 7
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch library",
        isLoading: false,
      });
    }
  },

  fetchLikedSongs: async () => {
    // Эту функцию можно оставить, если она нужна для более специфичных запросов,
    // но fetchLibrary теперь будет получать все.
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
      await get().fetchLibrary(); // Обновляем всю библиотеку после изменения
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

      // Оптимистичное обновление или полный рефетч
      if (isLiked) {
        // Если лайкнули, добавить песню в likedSongs (если ее там нет)
        // Или просто сделать рефетч для простоты
        await get().fetchLikedSongs(); // Рефетч лайкнутых песен
      } else {
        // Если дизлайкнули, удалить песню из likedSongs
        set((state) => ({
          likedSongs: state.likedSongs.filter((song) => song._id !== songId),
        }));
      }
    } catch (err) {
      console.error("Toggle song like error", err);
      set({ error: "Failed to toggle song like" });
    }
  },

  // НОВАЯ ФУНКЦИЯ: Добавление/удаление плейлиста из библиотеки
  togglePlaylist: async (playlistId: string) => {
    try {
      await axiosInstance.post("/library/playlists/toggle", { playlistId }); // Предполагаем такой эндпоинт
      await get().fetchLibrary(); // Обновляем всю библиотеку после изменения
    } catch (err) {
      console.error("Toggle playlist error", err);
      set({ error: "Failed to toggle playlist in library" });
    }
  },

  isSongLiked: (songId: string) => {
    return get().likedSongs.some((song) => song._id === songId);
  },
}));
