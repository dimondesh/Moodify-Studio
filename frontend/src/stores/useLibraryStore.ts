/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Album, Song, LibraryPlaylist, Artist } from "../types";

interface LibraryStore {
  albums: Album[];
  likedSongs: Song[];
  playlists: LibraryPlaylist[];
  followedArtists: Artist[]; // <-- НОВОЕ: Массив подписанных артистов (объектов Artist)
  isLoading: boolean;
  error: string | null;
  fetchLibrary: () => Promise<void>;
  fetchLikedSongs: () => Promise<void>;
  fetchFollowedArtists: () => Promise<void>; // <-- НОВОЕ
  toggleAlbum: (albumId: string) => Promise<void>;
  toggleSongLike: (songId: string) => Promise<void>;
  togglePlaylist: (playlistId: string) => Promise<void>;
  toggleArtistFollow: (artistId: string) => Promise<void>; // <-- НОВОЕ
  isSongLiked: (songId: string) => boolean;
  isArtistFollowed: (artistId: string) => boolean; // <-- НОВАЯ ФУНКЦИЯ
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  albums: [],
  likedSongs: [],
  playlists: [],
  followedArtists: [], // <-- Инициализируем
  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log("useLibraryStore: Attempting to fetch library data...");

      const [albumsRes, likedSongsRes, playlistsRes, followedArtistsRes] =
        await Promise.all([
          axiosInstance.get("/library/albums"),
          axiosInstance.get("/library/liked-songs"),
          axiosInstance.get("/library/playlists"),
          axiosInstance.get("/library/artists"), // <-- НОВОЕ
        ]);

      set({
        albums: albumsRes.data.albums || [],
        likedSongs: likedSongsRes.data.songs || [],
        playlists: playlistsRes.data.playlists || [],
        followedArtists: followedArtistsRes.data.artists || [], // <-- Устанавливаем подписанных артистов
        isLoading: false,
      });
      console.log("useLibraryStore: Library data fetched successfully.");
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

  fetchFollowedArtists: async () => {
    // <-- НОВАЯ ФУНКЦИЯ
    set({ isLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/library/artists");
      set({ followedArtists: res.data.artists, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch followed artists",
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

      if (isLiked) {
        await get().fetchLikedSongs();
      } else {
        set((state) => ({
          likedSongs: state.likedSongs.filter((song) => song._id !== songId),
        }));
      }
    } catch (err) {
      console.error("Toggle song like error", err);
      set({ error: "Failed to toggle song like" });
    }
  },

  togglePlaylist: async (playlistId: string) => {
    try {
      await axiosInstance.post("/library/playlists/toggle", { playlistId });
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle playlist error", err);
      set({ error: "Failed to toggle playlist in library" });
    }
  },

  toggleArtistFollow: async (artistId: string) => {
    // <-- НОВАЯ ФУНКЦИЯ
    try {
      const { isFollowed } = (
        await axiosInstance.post("/library/artists/toggle", { artistId })
      ).data;

      if (isFollowed) {
        await get().fetchFollowedArtists();
      } else {
        set((state) => ({
          followedArtists: state.followedArtists.filter(
            (artist) => artist._id !== artistId
          ),
        }));
      }
    } catch (err) {
      console.error("Toggle artist follow error", err);
      set({ error: "Failed to toggle artist follow" });
    }
  },

  isSongLiked: (songId: string) => {
    return get().likedSongs.some((song) => song._id === songId);
  },

  isArtistFollowed: (artistId: string) => {
    // <-- НОВАЯ ФУНКЦИЯ
    return get().followedArtists.some((artist) => artist._id === artistId);
  },
}));
