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
  type: "album";
  createdAt: string;
  updatedAt: string;
  // 💡 Добавим опциональное поле addedAt для альбомов в библиотеке
  addedAt: string;
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
  email: string; // Добавить email, если используется в AuthStore или отображается
  isAdmin?: boolean; // Добавить опциональное поле isAdmin
  playlists?: Playlist[];
}

export interface SearchState {
  query: string;
  songs: Song[];
  albums: Album[];
  playlists: Playlist[]; // <-- ЭТО ВАЖНО: должно быть здесь

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

export interface Playlist {
  _id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  owner: User; // Ссылка на владельца плейлиста
  songs: Song[]; // Массив песен в плейлисте
  type: "playlist";
  imageUrl?: string; // Обложка плейлиста
  likes: number; // Массив ID пользователей, которые лайкнули плейлист
  createdAt: string;
  updatedAt: string;
}

export interface BaseLibraryItem {
  _id: string;
  title: string;
  imageUrl?: string | null;
  createdAt: Date; // Используем Date здесь, так как мы преобразуем при создании
}

// Конкретный тип для "Liked Songs"
export interface LikedSongsItem extends BaseLibraryItem {
  type: "liked-songs";
  songsCount: number;
}

// Конкретный тип для альбомов
export interface AlbumItem extends BaseLibraryItem {
  type: "album";
  artist: string;
}

// Конкретный тип для плейлистов
export interface PlaylistItem extends BaseLibraryItem {
  type: "playlist";
  owner: User; // Важно, чтобы здесь был тип User
}

// Объединяющий тип для всех элементов библиотеки
export type LibraryItem = LikedSongsItem | AlbumItem | PlaylistItem;

export interface LibraryPlaylist extends Playlist {
  addedAt: string; // Дата, когда юзер добавил чужой плейлист в свою библиотеку
}
