/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { SearchState } from "../types";

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  songs: [],
  albums: [],
  loading: false,
  error: null,

  setQuery: (q) => set({ query: q }),

  search: async (q) => {
    if (!q.trim()) {
      set({ songs: [], albums: [], loading: false, error: null, query: "" });
      return;
    }

    set({ loading: true, error: null, query: q });

    try {
      const res = await axiosInstance.get("/search", { params: { q } });
      set({
        songs: res.data.songs || [],
        albums: res.data.albums || [],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message || "Failed to search", loading: false });
    }
  },
}));
