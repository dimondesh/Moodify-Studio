// src/stores/useSearchStore.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { Playlist, Song, Album, Artist, User, Mix } from "../types";

interface SearchState {
  query: string;
  songs: Song[];
  albums: Album[];
  playlists: Playlist[];
  users: User[];
  mixes: Mix[];
  artists: Artist[];
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
  artists: [],
  users: [],
  mixes: [],

  loading: false,
  error: null,

  setQuery: (q) => set({ query: q }),

  search: async (q) => {
    if (!q.trim()) {
      set({
        songs: [],
        albums: [],
        playlists: [],
        artists: [],
        users: [],
        mixes: [],
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
        artists: res.data.artists || [],
        users: res.data.users || [],
        mixes: res.data.mixes || [],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message || "Failed to search", loading: false });
    }
  },
}));
