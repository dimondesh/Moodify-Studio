// src/stores/useGeneratedPlaylistStore.ts

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";
import type { GeneratedPlaylist } from "@/types";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

interface GeneratedPlaylistStore {
  allGeneratedPlaylists: GeneratedPlaylist[]; // НОВОЕ: для HomePage
  currentPlaylist: GeneratedPlaylist | null;
  isLoading: boolean;
  error: string | null;

  fetchAllGeneratedPlaylists: () => Promise<void>; // НОВОЕ: для HomePage
  fetchPlaylistById: (id: string) => Promise<void>;
  reset: () => void;
}

export const useGeneratedPlaylistStore = create<GeneratedPlaylistStore>(
  (set) => ({
    allGeneratedPlaylists: [],
    currentPlaylist: null,
    isLoading: false,
    error: null,

    fetchAllGeneratedPlaylists: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await axiosInstance.get("/generated-playlists/me");
        set({ allGeneratedPlaylists: response.data || [], isLoading: false });
      } catch (err) {
        console.error("Failed to fetch all generated playlists:", err);
        set({ isLoading: false, allGeneratedPlaylists: [] });
      }
    },

    fetchPlaylistById: async (id: string) => {
      set({ isLoading: true, error: null, currentPlaylist: null });
      try {
        const response = await axiosInstance.get(`/generated-playlists/${id}`);
        set({ currentPlaylist: response.data, isLoading: false });
      } catch (err) {
        let errorMessage = "Failed to fetch this playlist";
        if (err instanceof AxiosError && err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
        set({ error: errorMessage, isLoading: false });
        toast.error(errorMessage);
      }
    },

    reset: () => {
      set({ currentPlaylist: null, isLoading: false, error: null });
    },
  })
);
