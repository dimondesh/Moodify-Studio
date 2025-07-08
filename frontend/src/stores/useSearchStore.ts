/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { Playlist, Song, Album } from "../types"; // Импортируем Playlist

// Обновленный интерфейс SearchState для включения playlists
interface SearchState {
  query: string;
  songs: Song[];
  albums: Album[];
  playlists: Playlist[]; // Добавляем плейлисты
  loading: boolean;
  error: string | null;
  setQuery: (q: string) => void;
  search: (q: string) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  songs: [],
  albums: [],
  playlists: [], // Инициализируем пустое поле для плейлистов
  loading: false,
  error: null,

  setQuery: (q) => set({ query: q }),

  search: async (q) => {
    if (!q.trim()) {
      set({
        songs: [],
        albums: [],
        playlists: [],
        loading: false,
        error: null,
        query: "",
      }); // Очищаем и плейлисты
      return;
    }

    set({ loading: true, error: null, query: q });

    try {
      // Предполагаем, что ваш бэкенд будет возвращать плейлисты по маршруту /search
      const res = await axiosInstance.get("/search", { params: { q } });
      set({
        songs: res.data.songs || [],
        albums: res.data.albums || [],
        playlists: res.data.playlists || [], // Обновляем состояние плейлистов
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message || "Failed to search", loading: false });
    }
  },
}));
