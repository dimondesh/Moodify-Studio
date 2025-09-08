import { create } from "zustand";
import type { Playlist } from "../types";

interface ShareEntity {
  type: "song" | "album" | "playlist" | "mix";
  id: string;
}

interface SongRemovalInfo {
  songId: string;
  playlistId: string;
}

interface UIStore {
  isCreatePlaylistDialogOpen: boolean;
  editingPlaylist: Playlist | null;
  isSearchAndAddDialogOpen: boolean;
  shareEntity: ShareEntity | null;
  isEditProfileDialogOpen: boolean;
  playlistToDelete: Playlist | null;
  songToRemoveFromPlaylist: SongRemovalInfo | null;
  isUserSheetOpen: boolean;
  isHomePageLoading: boolean;

  setIsHomePageLoading: (isLoading: boolean) => void;

  openCreatePlaylistDialog: () => void;
  openEditPlaylistDialog: (playlist: Playlist) => void;
  openSearchAndAddDialog: () => void;
  openShareDialog: (entity: ShareEntity) => void;
  openEditProfileDialog: () => void;
  openDeletePlaylistDialog: (playlist: Playlist) => void;
  openRemoveSongFromPlaylistDialog: (info: SongRemovalInfo) => void;
  setUserSheetOpen: (isOpen: boolean) => void;

  closeAllDialogs: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isCreatePlaylistDialogOpen: false,
  editingPlaylist: null,
  isSearchAndAddDialogOpen: false,
  shareEntity: null,
  isEditProfileDialogOpen: false,
  playlistToDelete: null,
  songToRemoveFromPlaylist: null,
  isUserSheetOpen: false,
  isHomePageLoading: true,

  setIsHomePageLoading: (isLoading) => set({ isHomePageLoading: isLoading }),

  openCreatePlaylistDialog: () => set({ isCreatePlaylistDialogOpen: true }),
  openEditPlaylistDialog: (playlist) => set({ editingPlaylist: playlist }),
  openSearchAndAddDialog: () => set({ isSearchAndAddDialogOpen: true }),
  openShareDialog: (entity) => set({ shareEntity: entity }),
  openEditProfileDialog: () => set({ isEditProfileDialogOpen: true }),
  openDeletePlaylistDialog: (playlist) => set({ playlistToDelete: playlist }),
  openRemoveSongFromPlaylistDialog: (info) =>
    set({ songToRemoveFromPlaylist: info }),
  setUserSheetOpen: (isOpen) => set({ isUserSheetOpen: isOpen }),

  closeAllDialogs: () =>
    set({
      isCreatePlaylistDialogOpen: false,
      editingPlaylist: null,
      isSearchAndAddDialogOpen: false,
      shareEntity: null,
      isEditProfileDialogOpen: false,
      playlistToDelete: null,
      songToRemoveFromPlaylist: null,
    }),
}));
