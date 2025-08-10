/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Song, Album, Stats, Artist, Genre, Mood } from "../types/index";
import toast from "react-hot-toast";
import { useOfflineStore } from "./useOfflineStore";
import { getItem } from "../lib/offline-db";

interface MusicStore {
  albums: Album[];
  songs: Song[];
  artists: Artist[];
  isLoading: boolean;
  error: string | null;
  currentAlbum: Album | null;
  recentlyListenedSongs: Song[];

  featuredSongs: Song[];
  genres: Genre[];
  moods: Mood[];
  madeForYouSongs: Song[];
  trendingSongs: Song[];
  stats: Stats;
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

  fetchArtists: () => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  updateArtist: (artistId: string, formData: FormData) => Promise<void>;
  updateSong: (songId: string, formData: FormData) => Promise<void>;
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

  stats: {
    totalSongs: 0,
    totalAlbums: 0,
    totalUsers: 0,
    totalArtists: 0,
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
  deleteSong: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/admin/songs/${id}`);

      set((state) => ({
        songs: state.songs.filter((song) => song._id !== id),
      }));
      toast.success("Song deleted successfully");
    } catch (error: any) {
      console.log("Error in deleteSong", error);
      toast.error("Error deleting song");
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAlbum: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/admin/albums/${id}`);
      set((state) => ({
        albums: state.albums.filter((album) => album._id !== id),
        songs: state.songs.map((song) =>
          song.albumId === id ? { ...song, albumId: null } : song
        ),
      }));
      toast.success("Album deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete album: " + error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteArtist: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/admin/artists/${id}`);
      set((state) => ({
        artists: state.artists.filter((artist) => artist._id !== id),
        songs: state.songs
          .map((song) => ({
            ...song,
            artist: song.artist.filter((artist) => artist._id !== id), 
          }))
          .filter((song) => song.artist.length > 0), 
        albums: state.albums
          .map((album) => ({
            ...album,
            artist: album.artist.filter((artist) => artist._id !== id), 
          }))
          .filter((album) => album.artist.length > 0), 
      }));
      toast.success(
        "Artist and associated content relationships updated/deleted successfully"
      );
    } catch (error: any) {
      console.log("Error in deleteArtist", error);
      toast.error("Failed to delete artist: " + error.message);
    } finally {
      set({ isLoading: false });
    }
  },
  updateArtist: async (artistId, formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.put(
        `/admin/artists/${artistId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      set((state) => ({
        artists: state.artists.map((artist) =>
          artist._id === artistId ? response.data : artist
        ),
      }));
      toast.success("Artist updated successfully!");
    } catch (error: any) {
      console.error("Error updating artist:", error);
      throw error; 
    } finally {
      set({ isLoading: false });
    }
  },
  updateSong: async (songId, formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.put(
        `/admin/songs/${songId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      set((state) => ({
        songs: state.songs.map((song) =>
          song._id === songId ? response.data : song
        ),
      }));
      toast.success("Song updated successfully!");
    } catch (error: any) {
      console.error("Error updating song:", error);
      throw error;
    } finally {
      set({ isLoading: false });
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

    if (isOffline) {
      if (isDownloaded(id)) {
        console.log(`[Offline] Загрузка альбома ${id} из IndexedDB.`);
        try {
          const localAlbum = await getItem("albums", id);
          if (localAlbum) {
            set({ currentAlbum: localAlbum, isLoading: false });
            return;
          } else {
            throw new Error("Album not found in offline storage.");
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
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
      set({ currentAlbum: response.data.album, isLoading: false });
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
    if (useOfflineStore.getState().isOffline) return; 

    set({ isLoading: true, error: null });
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
