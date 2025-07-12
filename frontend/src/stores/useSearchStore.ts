/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { Playlist, Song, Album, Artist } from "../types"; // Импортируем Artist

// Обновленный интерфейс SearchState для включения artists
interface SearchState {
  query: string;
  songs: Song[];
  albums: Album[];
  playlists: Playlist[];
  artists: Artist[]; // Добавляем артистов
  loading: boolean;
  error: string | null;
  setQuery: (q: string) => void;
  search: (q: string) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  songs: [],
  albums: [],
  playlists: [],
  artists: [], // Инициализируем пустое поле для артистов
  loading: false,
  error: null,

  setQuery: (q) => set({ query: q }),

  search: async (q) => {
    if (!q.trim()) {
      set({
        songs: [],
        albums: [],
        playlists: [],
        artists: [], // Очищаем и артистов
        loading: false,
        error: null,
        query: "",
      });
      return;
    }

    set({ loading: true, error: null, query: q });

    try {
      const res = await axiosInstance.get("/search", { params: { q } });
      set({
        songs: res.data.songs || [],
        albums: res.data.albums || [],
        playlists: res.data.playlists || [],
        artists: res.data.artists || [], // Обновляем состояние артистов
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message || "Failed to search", loading: false });
    }
  },
}));
