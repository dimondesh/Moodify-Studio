// frontend/src/stores/useGeneratedPlaylistStore.ts

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";
import type { GeneratedPlaylist } from "@/types";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

interface GeneratedPlaylistStore {
  currentPlaylist: GeneratedPlaylist | null;
  isLoading: boolean;
  error: string | null;
  fetchPlaylistById: (id: string) => Promise<void>;
  reset: () => void;
}

export const useGeneratedPlaylistStore = create<GeneratedPlaylistStore>(
  (set) => ({
    currentPlaylist: null,
    isLoading: false,
    error: null,

    fetchPlaylistById: async (id: string) => {
      set({ isLoading: true, error: null, currentPlaylist: null });
      try {
        const response = await axiosInstance.get(`/generated-playlists/${id}`);
        set({ currentPlaylist: response.data, isLoading: false });
      } catch (err) {
        console.error(`Failed to fetch generated playlist by ID ${id}:`, err);
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
