/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Album, Song } from "../types";

interface LibraryStore {
  albums: Album[];
  likedSongs: Song[];
  isLoading: boolean;
  error: string | null;
  fetchLibrary: () => Promise<void>;
  toggleAlbum: (albumId: string) => Promise<void>;
  toggleSongLike: (songId: string) => Promise<void>;
  fetchLikedSongs: () => Promise<void>;
  isSongLiked: (songId: string) => boolean;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  albums: [],
  likedSongs: [],
  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/library/albums");
      set({ albums: res.data.albums, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch library",
        isLoading: false,
      });
    }
  },

  fetchLikedSongs: async () => {
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
      await get().fetchLibrary();
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

      set((state) => {
        if (isLiked) {
          return {};
        } else {
          return {
            likedSongs: state.likedSongs.filter((song) => song._id !== songId),
          };
        }
      });
      await get().fetchLikedSongs();
    } catch (err) {
      console.error("Toggle song like error", err);
      set({ error: "Failed to toggle song like" });
    }
  },

  isSongLiked: (songId: string) => {
    return get().likedSongs.some((song) => song._id === songId);
  },
}));
