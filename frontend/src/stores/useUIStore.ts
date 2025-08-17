import { create } from "zustand";
import type { Playlist } from "../types";

// Интерфейс для данных, передаваемых в диалог "Поделиться"
interface ShareEntity {
  type: "song" | "album" | "playlist";
  id: string;
}

// Интерфейс для данных, передаваемых в диалог удаления песни из плейлиста
interface SongRemovalInfo {
  songId: string;
  playlistId: string;
}

// Главный интерфейс хранилища UI
interface UIStore {
  // Состояния для отслеживания открытых диалогов
  isCreatePlaylistDialogOpen: boolean;
  editingPlaylist: Playlist | null;
  isSearchAndAddDialogOpen: boolean;
  shareEntity: ShareEntity | null;
  isEditProfileDialogOpen: boolean;
  playlistToDelete: Playlist | null;
  songToRemoveFromPlaylist: SongRemovalInfo | null;

  // Методы для открытия диалогов
  openCreatePlaylistDialog: () => void;
  openEditPlaylistDialog: (playlist: Playlist) => void;
  openSearchAndAddDialog: () => void;
  openShareDialog: (entity: ShareEntity) => void;
  openEditProfileDialog: () => void;
  openDeletePlaylistDialog: (playlist: Playlist) => void;
  openRemoveSongFromPlaylistDialog: (info: SongRemovalInfo) => void;

  // Метод для закрытия всех диалогов
  closeAllDialogs: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // --- Начальные состояния ---
  isCreatePlaylistDialogOpen: false,
  editingPlaylist: null,
  isSearchAndAddDialogOpen: false,
  shareEntity: null,
  isEditProfileDialogOpen: false,
  playlistToDelete: null,
  songToRemoveFromPlaylist: null,

  // --- Методы для открытия диалогов ---
  openCreatePlaylistDialog: () => set({ isCreatePlaylistDialogOpen: true }),
  openEditPlaylistDialog: (playlist) => set({ editingPlaylist: playlist }),
  openSearchAndAddDialog: () => set({ isSearchAndAddDialogOpen: true }),
  openShareDialog: (entity) => set({ shareEntity: entity }),
  openEditProfileDialog: () => set({ isEditProfileDialogOpen: true }),
  openDeletePlaylistDialog: (playlist) => set({ playlistToDelete: playlist }),
  openRemoveSongFromPlaylistDialog: (info) =>
    set({ songToRemoveFromPlaylist: info }),

  // --- Метод для закрытия всех диалогов ---
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
