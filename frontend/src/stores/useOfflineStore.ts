/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/stores/useOfflineStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  getAllKeys,
  getItem,
  saveItem,
  deleteItem,
  getDb,
} from "@/lib/offline-db";
import type { Song, Album, Playlist, Mix } from "@/types";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";

type DownloadableItemData = Album | Playlist | Mix;
type DownloadableItemWithValue = (Album | Playlist | Mix) & {
  songsData: Song[];
};
type ItemType = "albums" | "playlists" | "mixes";

interface OfflineState {
  downloadedItemIds: Set<string>;
  downloadingItemIds: Set<string>;
  isOffline: boolean;
  _hasHydrated: boolean; // Флаг для отслеживания гидратации
  actions: {
    init: () => Promise<void>; // init снова здесь
    checkOnlineStatus: () => void;
    isDownloaded: (itemId: string) => boolean;
    isDownloading: (itemId: string) => boolean;
    downloadItem: (itemId: string, itemType: ItemType) => Promise<void>;
    getStorageUsage: () => Promise<{ usage: number; quota: number }>; // <-- НОВЫЙ ACTION
    clearAllDownloads: () => Promise<void>; // <-- НОВЫЙ ACTION
    deleteItem: (
      itemId: string,
      itemType: ItemType,
      itemTitle: string
    ) => Promise<void>;
  };
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      downloadedItemIds: new Set(),
      downloadingItemIds: new Set(),
      isOffline: !navigator.onLine,
      _hasHydrated: false, // Инициализируем как false

      actions: {
        init: async () => {
          const [albumKeys, playlistKeys, mixKeys] = await Promise.all([
            getAllKeys("albums"),
            getAllKeys("playlists"),
            getAllKeys("mixes"),
          ]);
          const allKeys = [...albumKeys, ...playlistKeys, ...mixKeys].map(
            String
          );
          set({ downloadedItemIds: new Set(allKeys) });

          get().actions.checkOnlineStatus();
          window.addEventListener("online", get().actions.checkOnlineStatus);
          window.addEventListener("offline", get().actions.checkOnlineStatus);
        },
        checkOnlineStatus: () => {
          set({ isOffline: !navigator.onLine });
        },
        isDownloaded: (itemId) => get().downloadedItemIds.has(itemId),
        isDownloading: (itemId) => get().downloadingItemIds.has(itemId),

        downloadItem: async (itemId, itemType) => {
          if (
            get().downloadedItemIds.has(itemId) ||
            get().downloadingItemIds.has(itemId)
          ) {
            return;
          }

          set((state) => ({
            downloadingItemIds: new Set(state.downloadingItemIds).add(itemId),
          }));

          let itemData: DownloadableItemData | null = null;

          try {
            const endpoint =
              itemType === "albums"
                ? `/albums/${itemId}`
                : `/${itemType}/${itemId}`;
            const response = await axiosInstance.get(endpoint);
            itemData =
              itemType === "albums" ? response.data.album : response.data;

            if (!itemData || !itemData.songs) {
              throw new Error("Invalid item data received from server.");
            }

            const songsData = itemData.songs as Song[];

            const urlsToCache = new Set<string>();
            if (itemData.imageUrl) urlsToCache.add(itemData.imageUrl);

            songsData.forEach((song) => {
              if (song.imageUrl) urlsToCache.add(song.imageUrl);
              if (song.instrumentalUrl) urlsToCache.add(song.instrumentalUrl);
              if (song.vocalsUrl) urlsToCache.add(song.vocalsUrl);
            });

            const audioCache = await caches.open("moodify-audio-cache");
            const imageCache = await caches.open("cloudinary-images-cache");

            const urls = Array.from(urlsToCache).filter(Boolean);
            const imageUrls = urls.filter((url) => url.includes("cloudinary"));
            const audioUrls = urls.filter((url) => !url.includes("cloudinary"));

            if (audioUrls.length > 0) await audioCache.addAll(audioUrls);
            if (imageUrls.length > 0) await imageCache.addAll(imageUrls);

            const itemToSave: DownloadableItemWithValue = {
              ...itemData,
              songsData,
            };
            await saveItem(itemType, itemToSave);

            for (const song of songsData) {
              await saveItem("songs", song);
            }

            set((state) => {
              const newDownloaded = new Set(state.downloadedItemIds).add(
                itemId
              );
              const newDownloading = new Set(state.downloadingItemIds);
              newDownloading.delete(itemId);
              return {
                downloadedItemIds: newDownloaded,
                downloadingItemIds: newDownloading,
              };
            });
          } catch (error) {
            console.error(`Failed to download ${itemType} ${itemId}:`, error);
            const title =
              itemData && "title" in itemData
                ? itemData.title
                : itemData && "name" in itemData
                ? itemData.name
                : "item";
            toast.error(`Could not download ${title}.`);
            set((state) => {
              const newDownloading = new Set(state.downloadingItemIds);
              newDownloading.delete(itemId);
              return { downloadingItemIds: newDownloading };
            });
          }
        },

        deleteItem: async (itemId, itemType, itemTitle) => {
          try {
            const itemToDelete = await getItem(itemType, itemId);
            if (!itemToDelete) return;

            const urlsToDelete = new Set<string>();
            if (itemToDelete.imageUrl) urlsToDelete.add(itemToDelete.imageUrl);

            const songs = (itemToDelete.songsData ||
              itemToDelete.songs) as Song[];
            songs.forEach((song) => {
              if (song.imageUrl) urlsToDelete.add(song.imageUrl);
              if (song.instrumentalUrl) urlsToDelete.add(song.instrumentalUrl);
              if (song.vocalsUrl) urlsToDelete.add(song.vocalsUrl);
            });

            const audioCache = await caches.open("moodify-audio-cache");
            const imageCache = await caches.open("cloudinary-images-cache");

            for (const url of urlsToDelete) {
              if (url) {
                await audioCache.delete(url);
                await imageCache.delete(url);
              }
            }

            await deleteItem(itemType, itemId);

            set((state) => {
              const newDownloaded = new Set(state.downloadedItemIds);
              newDownloaded.delete(itemId);
              return { downloadedItemIds: newDownloaded };
            });
            toast.success(`"${itemTitle}" removed from downloads.`);
          } catch (error) {
            console.error(`Failed to delete ${itemType} ${itemId}:`, error);
            toast.error(`Could not remove "${itemTitle}".`);
          }
        },
        getStorageUsage: async () => {
          if (navigator.storage && navigator.storage.estimate) {
            const estimation = await navigator.storage.estimate();
            return {
              usage: estimation.usage || 0,
              quota: estimation.quota || 0,
            };
          }
          return { usage: 0, quota: 0 };
        },
        clearAllDownloads: async () => {
          const downloadedIds = Array.from(get().downloadedItemIds);
          if (downloadedIds.length === 0) {
            toast.success("No downloads to clear.");
            return;
          }

          toast.loading("Clearing all downloads...");
          try {
            // Очищаем кэши
            await caches.delete("moodify-audio-cache");
            await caches.delete("cloudinary-images-cache");

            // Очищаем IndexedDB
            const db = await getDb();
            await Promise.all([
              db.clear("albums"),
              db.clear("playlists"),
              db.clear("mixes"),
              db.clear("songs"),
            ]);

            // Очищаем состояние
            set({
              downloadedItemIds: new Set(),
              downloadingItemIds: new Set(),
            });

            toast.dismiss();
            toast.success("All downloads have been cleared.");
          } catch (error) {
            console.error("Failed to clear all downloads:", error);
            toast.dismiss();
            toast.error("An error occurred while clearing downloads.");
          }
        },
      },
    }),
    {
      name: "moodify-offline-storage",
      storage: createJSONStorage(() => localStorage, {
        replacer: (_, value: any) => {
          if (value instanceof Set) {
            return { __type: "Set", value: Array.from(value) };
          }
          return value;
        },
        reviver: (_, value: any) => {
          if (value && value.__type === "Set") {
            return new Set(value.value);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        downloadedItemIds: state.downloadedItemIds,
      }),
      onRehydrateStorage: () => (state) => {
        // Устанавливаем флаг после восстановления состояния
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);
