/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Album, Song, LibraryPlaylist, Artist, Mix } from "../types"; // Убедитесь, что Mix импортирован
import { useOfflineStore } from "./useOfflineStore";

interface LibraryStore {
  albums: Album[];
  likedSongs: Song[];
  playlists: LibraryPlaylist[];
  followedArtists: Artist[];
  savedMixes: Mix[]; // <-- Поле уже есть, все отлично

  isLoading: boolean;
  error: string | null;

  fetchLibrary: () => Promise<void>;
  fetchLikedSongs: () => Promise<void>; // Можно будет удалить, если не используется где-то еще
  fetchFollowedArtists: () => Promise<void>; // Можно будет удалить

  toggleAlbum: (albumId: string) => Promise<void>;
  toggleSongLike: (songId: string) => Promise<void>;
  togglePlaylist: (playlistId: string) => Promise<void>;
  toggleArtistFollow: (artistId: string) => Promise<void>;
  toggleMixInLibrary: (mixId: string) => Promise<void>; // <-- НОВАЯ ФУНКЦИЯ

  isSongLiked: (songId: string) => boolean;
  isArtistFollowed: (artistId: string) => boolean;
  isMixSaved: (mixId: string) => boolean; // <-- НОВАЯ ФУНКЦИЯ
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  albums: [],
  likedSongs: [],
  playlists: [],
  followedArtists: [],
  savedMixes: [],

  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log("useLibraryStore: Attempting to fetch all library data...");

      // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Добавляем пятый запрос в Promise.all ---
      const [
        albumsRes,
        likedSongsRes,
        playlistsRes,
        followedArtistsRes,
        savedMixesRes, // <-- ПОЛУЧАЕМ РЕЗУЛЬТАТ ДЛЯ МИКСОВ
      ] = await Promise.all([
        axiosInstance.get("/library/albums"),
        axiosInstance.get("/library/liked-songs"),
        axiosInstance.get("/library/playlists"),
        axiosInstance.get("/library/artists"),
        axiosInstance.get("/library/mixes"), // <-- НОВЫЙ ЗАПРОС
      ]);

      // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Обновляем состояние, включая миксы ---
      set({
        albums: albumsRes.data.albums || [],
        likedSongs: likedSongsRes.data.songs || [],
        playlists: playlistsRes.data.playlists || [],
        followedArtists: followedArtistsRes.data.artists || [],
        savedMixes: savedMixesRes.data.mixes || [], // <-- СОХРАНЯЕМ МИКСЫ В СОСТОЯНИЕ
        isLoading: false,
      });
      console.log("useLibraryStore: All library data fetched successfully.");
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch library",
        isLoading: false,
      });
    }
  },

  // Эта функция больше не нужна, так как ее логика теперь внутри fetchLibrary.
  // Оставляю ее закомментированной на случай, если она нужна для чего-то еще.
  // fetchSavedMixes: async () => { ... },

  // Эта функция тоже может быть удалена, если вызывается только fetchLibrary
  fetchLikedSongs: async () => {
    if (useOfflineStore.getState().isOffline) return; // ЗАЩИТА

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

  // И эта тоже
  fetchFollowedArtists: async () => {
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
      await get().fetchLibrary(); // Полное обновление - самый надежный способ
    } catch (err) {
      console.error("Toggle album error", err);
      set({ error: "Failed to toggle album" });
    }
  },

  toggleSongLike: async (songId: string) => {
    try {
      await axiosInstance.post("/library/songs/toggle-like", { songId });
      // Можно обновлять точечно или полностью
      await get().fetchLibrary();
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
    try {
      await axiosInstance.post("/library/artists/toggle", { artistId });
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle artist follow error", err);
      set({ error: "Failed to toggle artist follow" });
    }
  },

  // --- НОВАЯ ФУНКЦИЯ ДЛЯ ПЕРЕКЛЮЧЕНИЯ МИКСОВ ---
  toggleMixInLibrary: async (mixId: string) => {
    try {
      await axiosInstance.post("/library/mixes/toggle", { mixId });
      // После изменения вызываем полное обновление, чтобы все компоненты получили свежие данные
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle mix in library error", err);
      set({ error: "Failed to toggle mix in library" });
    }
  },

  isSongLiked: (songId: string) => {
    return get().likedSongs.some((song) => song._id === songId);
  },

  isArtistFollowed: (artistId: string) => {
    return get().followedArtists.some((artist) => artist._id === artistId);
  },

  // --- НОВАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ МИКСОВ ---
  isMixSaved: (mixId: string) => {
    return get().savedMixes.some((mix) => mix._id === mixId);
  },
}));
