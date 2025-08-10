/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Album, Song, LibraryPlaylist, Artist, Mix } from "../types"; 
import { useOfflineStore } from "./useOfflineStore";

interface LibraryStore {
  albums: Album[];
  likedSongs: Song[];
  playlists: LibraryPlaylist[];
  followedArtists: Artist[];
  savedMixes: Mix[]; 

  isLoading: boolean;
  error: string | null;

  fetchLibrary: () => Promise<void>;
  fetchLikedSongs: () => Promise<void>; 
  fetchFollowedArtists: () => Promise<void>; 

  toggleAlbum: (albumId: string) => Promise<void>;
  toggleSongLike: (songId: string) => Promise<void>;
  togglePlaylist: (playlistId: string) => Promise<void>;
  toggleArtistFollow: (artistId: string) => Promise<void>;
  toggleMixInLibrary: (mixId: string) => Promise<void>; 

  isSongLiked: (songId: string) => boolean;
  isArtistFollowed: (artistId: string) => boolean;
  isMixSaved: (mixId: string) => boolean; 
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
    if (useOfflineStore.getState().isOffline) {
      console.log("[Offline] Skipping fetchLibrary.");
      return;
    }
    set({ isLoading: true, error: null });
    try {
      console.log("useLibraryStore: Attempting to fetch all library data...");

      const [
        albumsRes,
        likedSongsRes,
        playlistsRes,
        followedArtistsRes,
        savedMixesRes, 
      ] = await Promise.all([
        axiosInstance.get("/library/albums"),
        axiosInstance.get("/library/liked-songs"),
        axiosInstance.get("/library/playlists"),
        axiosInstance.get("/library/artists"),
        axiosInstance.get("/library/mixes"), 
      ]);

      set({
        albums: albumsRes.data.albums || [],
        likedSongs: likedSongsRes.data.songs || [],
        playlists: playlistsRes.data.playlists || [],
        followedArtists: followedArtistsRes.data.artists || [],
        savedMixes: savedMixesRes.data.mixes || [], 
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

  fetchLikedSongs: async () => {
    if (useOfflineStore.getState().isOffline) return; 

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
    if (useOfflineStore.getState().isOffline) return; 

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
    if (useOfflineStore.getState().isOffline) return; 

    try {
      await axiosInstance.post("/library/albums/toggle", { albumId });
      await get().fetchLibrary(); 
    } catch (err) {
      console.error("Toggle album error", err);
      set({ error: "Failed to toggle album" });
    }
  },

  toggleSongLike: async (songId: string) => {
    if (useOfflineStore.getState().isOffline) return; 

    try {
      await axiosInstance.post("/library/songs/toggle-like", { songId });
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle song like error", err);
      set({ error: "Failed to toggle song like" });
    }
  },

  togglePlaylist: async (playlistId: string) => {
    if (useOfflineStore.getState().isOffline) return; 

    try {
      await axiosInstance.post("/library/playlists/toggle", { playlistId });
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle playlist error", err);
      set({ error: "Failed to toggle playlist in library" });
    }
  },

  toggleArtistFollow: async (artistId: string) => {
    if (useOfflineStore.getState().isOffline) return; 

    try {
      await axiosInstance.post("/library/artists/toggle", { artistId });
      await get().fetchLibrary();
    } catch (err) {
      console.error("Toggle artist follow error", err);
      set({ error: "Failed to toggle artist follow" });
    }
  },

  toggleMixInLibrary: async (mixId: string) => {
    if (useOfflineStore.getState().isOffline) return; 

    try {
      await axiosInstance.post("/library/mixes/toggle", { mixId });
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

  isMixSaved: (mixId: string) => {
    return get().savedMixes.some((mix) => mix._id === mixId);
  },
}));
