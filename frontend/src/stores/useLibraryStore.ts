/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type {
  Album,
  Song,
  LibraryPlaylist,
  Artist,
  Mix,
  GeneratedPlaylist,
} from "../types";
import { useOfflineStore } from "./useOfflineStore";
import {
  getAllUserAlbums,
  getAllUserPlaylists,
  getAllUserMixes,
  getAllUserSongs,
} from "../lib/offline-db";
import { useAuthStore } from "./useAuthStore";

interface LibraryStore {
  albums: Album[];
  likedSongs: Song[];
  playlists: LibraryPlaylist[];
  followedArtists: Artist[];
  savedMixes: Mix[];
  generatedPlaylists: GeneratedPlaylist[]; 

  isLoading: boolean;
  error: string | null;

  fetchLibrary: () => Promise<void>;
  fetchLikedSongs: () => Promise<void>;
  fetchFollowedArtists: () => Promise<void>;
  fetchGeneratedPlaylists: () => Promise<void>; 

  toggleAlbum: (albumId: string) => Promise<void>;
  toggleSongLike: (songId: string) => Promise<void>;
  togglePlaylist: (playlistId: string) => Promise<void>;
  toggleArtistFollow: (artistId: string) => Promise<void>;
  toggleMixInLibrary: (mixId: string) => Promise<void>;
  isAlbumInLibrary: (albumId: string) => boolean;
  isPlaylistInLibrary: (playlistId: string) => boolean;

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
  generatedPlaylists: [], 

  isLoading: false,
  error: null,

  fetchLibrary: async () => {
    const { isOffline } = useOfflineStore.getState();
    const userId = useAuthStore.getState().user?.id;
    set({ isLoading: true, error: null });

    if (isOffline) {
      console.log("[Offline] Fetching library from IndexedDB.");
      if (!userId) {
        set({
          isLoading: false,
          error: "User not available for offline library.",
        });
        return;
      }
      try {
        const [albums, playlists, savedMixes] = await Promise.all([
          getAllUserAlbums(userId),
          getAllUserPlaylists(userId),
          getAllUserMixes(userId),
        ]);

        set({
          albums,
          playlists: playlists as LibraryPlaylist[],
          savedMixes,
          likedSongs: [],
          followedArtists: [],
          isLoading: false,
        });
        console.log("[Offline] Library data loaded from IndexedDB.", {
          albums,
          playlists,
          savedMixes,
        });
      } catch (err: any) {
        console.error("Failed to fetch offline library data:", err);
        set({
          error: err.message || "Failed to fetch library from storage",
          isLoading: false,
        });
      }
      return;
    }

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
      });

      await get().fetchGeneratedPlaylists();

      console.log("useLibraryStore: All library data fetched successfully.");
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch library",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchGeneratedPlaylists: async () => {
    if (useOfflineStore.getState().isOffline) return;
    try {
      const response = await axiosInstance.get("/generated-playlists/me");
      set({ generatedPlaylists: response.data || [] });
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error("Failed to fetch generated playlists:", err);
      }
      set({ generatedPlaylists: [] });
    }
  },

  fetchLikedSongs: async () => {
    const { isOffline } = useOfflineStore.getState();
    const userId = useAuthStore.getState().user?.id;
    set({ isLoading: true, error: null });

    if (isOffline) {
      if (!userId) {
        set({ isLoading: false, error: "User not available offline." });
        return;
      }
      console.log(
        "[Offline] Fetching liked songs (all downloaded songs) from IndexedDB."
      );
      try {
        const allDownloadedSongs = await getAllUserSongs(userId);
        set({ likedSongs: allDownloadedSongs, isLoading: false });
      } catch (err: any) {
        set({
          error: err.message || "Failed to fetch offline songs",
          isLoading: false,
        });
      }
      return;
    }

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
  isAlbumInLibrary: (albumId: string) => {
    return get().albums.some((album) => album._id === albumId);
  },

  isPlaylistInLibrary: (playlistId: string) => {
    return get().playlists.some((playlist) => playlist._id === playlistId);
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
