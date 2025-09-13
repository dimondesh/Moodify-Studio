/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/src/stores/useMusicStore.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Song, Album, Stats, Artist, Genre, Mood } from "../types/index";
import toast from "react-hot-toast";
import { useOfflineStore } from "./useOfflineStore";
import {
  getUserItem,
  getAllUserAlbums,
  getAllUserSongs,
} from "../lib/offline-db";
import { useAuthStore } from "./useAuthStore";

interface MusicStore {
  albums: Album[];
  songs: Song[];
  artists: Artist[];
  isLoading: boolean;
  error: string | null;
  currentAlbum: Album | null;
  recentlyListenedSongs: Song[];
  homePageDataLastFetched: number | null;

  featuredSongs: Song[];
  genres: Genre[];
  moods: Mood[];
  madeForYouSongs: Song[];
  trendingSongs: Song[];
  stats: Stats;

  paginatedSongs: Song[];
  songsPage: number;
  songsTotalPages: number;

  paginatedAlbums: Album[];
  albumsPage: number;
  albumsTotalPages: number;

  paginatedArtists: Artist[];
  artistsPage: number;
  artistsTotalPages: number;
  artistAppearsOn: Album[];
  isAppearsOnLoading: boolean;
  favoriteArtists: Artist[];
  newReleases: Album[];

  clearHomePageCache: () => void;

  fetchAlbums: () => Promise<void>;
  fetchAlbumbyId: (id: string) => Promise<void>;
  fetchFeaturedSongs: () => Promise<void>;
  fetchMadeForYouSongs: () => Promise<void>;
  fetchTrendingSongs: () => Promise<void>;
  fetchGenres: () => Promise<void>;
  fetchMoods: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchSongs: () => Promise<void>;
  fetchRecentlyListenedSongs: () => Promise<void>;
  fetchFavoriteArtists: () => Promise<void>;
  fetchNewReleases: () => Promise<void>;

  fetchArtists: () => Promise<void>;
  fetchArtistAppearsOn: (artistId: string) => Promise<void>;
}

export const useMusicStore = create<MusicStore>((set) => ({
  albums: [],
  songs: [],
  artists: [],
  isLoading: false,
  error: null,
  genres: [],
  moods: [],
  currentAlbum: null,
  featuredSongs: [],
  madeForYouSongs: [],
  trendingSongs: [],
  recentlyListenedSongs: [],
  favoriteArtists: [],
  newReleases: [],
  homePageDataLastFetched: null,
  paginatedSongs: [],
  songsPage: 1,
  songsTotalPages: 1,
  paginatedAlbums: [],
  albumsPage: 1,
  albumsTotalPages: 1,
  paginatedArtists: [],
  artistsPage: 1,
  artistsTotalPages: 1,
  artistAppearsOn: [],
  isAppearsOnLoading: false,
  stats: {
    totalSongs: 0,
    totalAlbums: 0,
    totalUsers: 0,
    totalArtists: 0,
  },

  clearHomePageCache: () => {
    set({ homePageDataLastFetched: null });
    console.log("Homepage cache cleared.");
  },

  fetchArtistAppearsOn: async (artistId: string) => {
    set({ isAppearsOnLoading: true, error: null });
    try {
      const response = await axiosInstance.get(
        `/artists/${artistId}/appears-on`
      );
      set({ artistAppearsOn: response.data, isAppearsOnLoading: false });
    } catch (error: any) {
      console.error("Failed to fetch 'Appears On' albums:", error);
      set({
        error:
          error.response?.data?.message ||
          "Failed to fetch 'Appears On' section",
        isAppearsOnLoading: false,
      });
    }
  },
  fetchFavoriteArtists: async () => {
    if (useOfflineStore.getState().isOffline) return;
    try {
      const response = await axiosInstance.get("/users/me/favorite-artists");
      set({ favoriteArtists: response.data });
    } catch (error: any) {
      console.error("Failed to fetch favorite artists:", error);
    }
  },
  fetchNewReleases: async () => {
    if (useOfflineStore.getState().isOffline) return;
    try {
      const response = await axiosInstance.get(
        "/users/me/recommendations/new-releases"
      );
      set({ newReleases: response.data });
    } catch (error: any) {
      console.error("Failed to fetch new releases:", error);
    }
  },

  fetchGenres: async () => {
    try {
      const response = await axiosInstance.get("/admin/genres");
      set({ genres: response.data });
    } catch (error) {
      console.error("Failed to fetch genres", error);
    }
  },
  fetchMoods: async () => {
    try {
      const response = await axiosInstance.get("/admin/moods");
      set({ moods: response.data });
    } catch (error) {
      console.error("Failed to fetch moods", error);
    }
  },

  fetchAlbums: async () => {
    if (useOfflineStore.getState().isOffline) return;
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/albums");
      set({ albums: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchAlbumbyId: async (id: string) => {
    set({ isLoading: true, error: null, currentAlbum: null });
    const { isOffline } = useOfflineStore.getState();
    const { isDownloaded } = useOfflineStore.getState().actions;
    const userId = useAuthStore.getState().user?.id;
    if (isOffline) {
      if (isDownloaded(id) && userId) {
        console.log(`[Offline] Загрузка альбома ${id} из IndexedDB.`);
        try {
          const localAlbum = await getUserItem("albums", id, userId);
          if (localAlbum) {
            set({ currentAlbum: localAlbum, isLoading: false });
            return;
          } else {
            throw new Error(
              "Album not found in offline storage for this user."
            );
          }
        } catch (error) {
          const errorMsg = "Failed to load album from offline storage.";
          set({ currentAlbum: null, error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          return;
        }
      } else {
        const errorMsg =
          "This album is not downloaded and unavailable offline.";
        set({ currentAlbum: null, error: errorMsg, isLoading: false });
        toast.error(errorMsg);
        return;
      }
    }
    try {
      const response = await axiosInstance.get(`/albums/${id}`);
      const albumData = response.data.album;
      if (albumData && albumData.songs) {
        albumData.songs = albumData.songs.map((song: Song) => ({
          ...song,
          albumTitle: albumData.title,
        }));
      }
      set({ currentAlbum: albumData, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to fetch album",
        isLoading: false,
      });
    }
  },
  fetchFeaturedSongs: async () => {
    if (useOfflineStore.getState().isOffline) return;
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/featured");
      set({ featuredSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchMadeForYouSongs: async () => {
    if (useOfflineStore.getState().isOffline) return;
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/made-for-you");
      set({ madeForYouSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchRecentlyListenedSongs: async () => {
    if (useOfflineStore.getState().isOffline) return;
    try {
      const response = await axiosInstance.get("/songs/history");
      set({ recentlyListenedSongs: response.data.songs || [] });
      console.log("✅ Recently Listened songs updated.");
    } catch (error: any) {
      console.error(
        "Could not fetch listen history:",
        error.response?.data?.message
      );
      set({ recentlyListenedSongs: [] });
    }
  },
  fetchTrendingSongs: async () => {
    if (useOfflineStore.getState().isOffline) return;
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/trending");
      set({ trendingSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs");
      set({ songs: response.data.songs });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchArtists: async () => {
    const { isOffline } = useOfflineStore.getState();
    const userId = useAuthStore.getState().user?.id;
    set({ isLoading: true, error: null });
    if (isOffline) {
      console.log(
        "[Offline] Constructing artists list from downloaded content."
      );
      if (!userId) {
        set({ artists: [], isLoading: false });
        return;
      }
      try {
        const [albums, songs] = await Promise.all([
          getAllUserAlbums(userId),
          getAllUserSongs(userId),
        ]);
        const artistMap = new Map<string, Artist>();
        const processArtist = (artist: Artist) => {
          if (artist && artist._id && !artistMap.has(artist._id)) {
            artistMap.set(artist._id, artist);
          }
        };
        albums.forEach((album: Album) =>
          (album.artist as Artist[]).forEach(processArtist)
        );
        songs.forEach((song: Song) =>
          (song.artist as Artist[]).forEach(processArtist)
        );
        const offlineArtists = Array.from(artistMap.values());
        set({ artists: offlineArtists, isLoading: false });
      } catch (e: any) {
        console.error("Error constructing offline artist list", e);
        set({ error: e.message, isLoading: false });
      }
      return;
    }
    try {
      const response = await axiosInstance.get("/artists");
      set({ artists: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/stats");
      set({ stats: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
