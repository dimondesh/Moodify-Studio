/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";
import type { Mix } from "@/types";
import { useLibraryStore } from "./useLibraryStore";
import { useOfflineStore } from "./useOfflineStore";
import { getItem } from "@/lib/offline-db";

interface MixesData {
  genreMixes: Mix[];
  moodMixes: Mix[];
}

interface MixesStore {
  genreMixes: Mix[];
  moodMixes: Mix[];
  currentMix: Mix | null;
  isLoading: boolean;
  error: string | null;
  fetchMixById: (id: string) => Promise<void>;

  fetchDailyMixes: () => Promise<void>;
  toggleMixInLibrary: (mixId: string) => Promise<void>;
}

export const useMixesStore = create<MixesStore>((set) => ({
  genreMixes: [],
  moodMixes: [],
  isLoading: false,
  error: null,
  currentMix: null,

  fetchDailyMixes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get<MixesData>("/mixes");
      set({
        genreMixes: response.data.genreMixes,
        moodMixes: response.data.moodMixes,
        isLoading: false,
      });
    } catch (err: any) {
      console.error("Failed to fetch mixes inlibrary:", err);
      toast.error(err.response?.data?.message || "Could not fetch mixes.");
    }
  },

  toggleMixInLibrary: async (mixId: string) => {
    try {
      const response = await axiosInstance.post(`/library/mixes/toggle`, {
        mixId,
      });
      const { isSaved } = response.data;
      toast.success(
        isSaved ? "Mix added to your library" : "Mix removed from your library"
      );

      useLibraryStore.getState().fetchLibrary();
    } catch (err: any) {
      console.error("Failed to toggle mix in library:", err);
      toast.error(err.response?.data?.message || "Could not update library.");
    }
  },
  fetchMixById: async (id: string) => {
    set({ isLoading: true, error: null });
    const { isOffline } = useOfflineStore.getState();
    const { isDownloaded } = useOfflineStore.getState().actions;
    if (isDownloaded(id)) {
      console.log(`[Offline] Загрузка микса ${id} из IndexedDB.`);
      const localMix = await getItem("mixes", id);
      if (localMix) {
        set({ currentMix: localMix, isLoading: false });
        return;
      }
    }

    if (isOffline) {
      const errorMsg = "Этот микс не скачан и недоступен в офлайн-режиме.";
      set({ currentMix: null, error: errorMsg, isLoading: false });
      toast.error(errorMsg);
      return;
    }
    try {
      const response = await axiosInstance.get(`/mixes/${id}`);
      set({ currentMix: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch mix", isLoading: false });
    }
  },
}));
