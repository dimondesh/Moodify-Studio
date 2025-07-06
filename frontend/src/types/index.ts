// frontend/src/types/index.ts

export interface Song {
  _id: string;
  title: string;
  artist: string;
  albumId: string | null;
  imageUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  createdAt: string;
  updatedAt: string;
  albumTitle?: string;
  // 💡 Добавим опциональное поле likedAt, так как оно будет только у лайкнутых песен
  likedAt?: string;
}

export interface Album {
  _id: string;
  title: string;
  artist: string;
  imageUrl: string;
  releaseYear: number;
  songs: Song[];
  type: string | "Album";
  createdAt: string;
  updatedAt: string;
  // 💡 Добавим опциональное поле addedAt для альбомов в библиотеке
  addedAt?: string;
}

export interface Stats {
  totalSongs: number;
  totalAlbums: number;
  totalUsers: number;
  totalArtists: number;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  firebaseUid: string;
  fullName: string;
  imageUrl: string;
}

export interface SearchState {
  query: string;
  songs: Song[];
  albums: Album[];
  loading: boolean;
  error: string | null;
  setQuery: (q: string) => void;
  search: (q: string) => Promise<void>;
}

// 💡 ОБНОВЛЕННЫЙ ИНТЕРФЕЙС UserLibrary для соответствия бэкенду
export interface UserLibrary {
  userId: string;
  likedSongs: Song[]; // 💡 ИСПРАВЛЕНО: Теперь массив полных объектов Song (включая likedAt)
  albums: Album[]; // 💡 ИСПРАВЛЕНО: Теперь массив полных объектов Album (включая addedAt)
}
