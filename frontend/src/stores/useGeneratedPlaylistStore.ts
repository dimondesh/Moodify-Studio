// src/stores/useGeneratedPlaylistStore.ts

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";
import type { GeneratedPlaylist } from "@/types";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
// --- ИЗМЕНЕНИЕ НАЧАЛО: Импортируем утилиты для работы с офлайн-режимом ---
import { useOfflineStore } from "./useOfflineStore";
import { useAuthStore } from "./useAuthStore";
import { getUserItem } from "@/lib/offline-db";
// --- ИЗМЕНЕНИЕ КОНЕЦ ---

interface GeneratedPlaylistStore {
  allGeneratedPlaylists: GeneratedPlaylist[];
  currentPlaylist: GeneratedPlaylist | null;
  isLoading: boolean;
  error: string | null;

  fetchAllGeneratedPlaylists: () => Promise<void>;
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

      // --- ИЗМЕНЕНИЕ НАЧАЛО: Логика для оффлайн-режима ---
      const { isOffline } = useOfflineStore.getState();
      const { isDownloaded } = useOfflineStore.getState().actions;
      const userId = useAuthStore.getState().user?.id;

      // 1. Проверяем, скачан ли плейлист и есть ли пользователь
      if (isDownloaded(id) && userId) {
        console.log(
          `[Offline] Loading generated playlist ${id} from IndexedDB.`
        );
        try {
          // Генеративные плейлисты хранятся в той же таблице, что и обычные
          const localPlaylist = await getUserItem("playlists", id, userId);
          if (localPlaylist) {
            set({
              currentPlaylist: localPlaylist as GeneratedPlaylist,
              isLoading: false,
            });
            return; // Успешно загрузили из офлайна, выходим
          }
        } catch (e) {
          console.error("Failed to load generated playlist from DB", e);
        }
      }

      // 2. Если мы в офлайне, а плейлист не скачан, показываем ошибку
      if (isOffline) {
        const errorMsg =
          "This playlist is not downloaded and is unavailable offline.";
        set({ currentPlaylist: null, error: errorMsg, isLoading: false });
        toast.error(errorMsg);
        return;
      }
      // --- ИЗМЕНЕНИЕ КОНЕЦ ---

      // 3. Если мы онлайн, делаем запрос к сети (существующая логика)
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
