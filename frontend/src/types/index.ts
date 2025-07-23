export interface Artist {
  _id: string;
  name: string;
  bio?: string; // Опционально
  imageUrl: string;
  songs: Song[]; // ИЗМЕНЕНО: Теперь массив объектов Song, так как бэкенд их populate'ит
  albums: Album[]; // ИЗМЕНЕНО: Теперь массив объектов Album, так как бэкенд их populate'ит
  addedAt?: string; // <--- ДОБАВЛЕНО: Это поле приходит из библиотеки для followedArtists
  bannerUrl?: string; // <--- Убедитесь, что это поле присутствует

  createdAt: string;
  updatedAt: string;
}

export interface Song {
  _id: string;
  title: string;
  // ИЗМЕНЕНО: теперь массив объектов Artist (для удобства отображения)
  // или массив строк (для передачи ID на бэкенд)
  artist: Artist[]; // <-- Убедитесь, что это Artist[]
  albumId: string | null;
  imageUrl: string;
  instrumentalUrl: string; // <-- ИЗМЕНЕНО: Теперь instrumentalUrl
  vocalsUrl?: string; // <-- НОВОЕ ПОЛЕ: Опциональная вокальная дорожка
  duration: number; // in seconds
  playCount: number; // <-- НОВОЕ ПОЛЕ
  createdAt: string;
  updatedAt: string;
  albumTitle?: string;
  likedAt?: string;
  lyrics?: string; // <-- НОВОЕ ПОЛЕ: Для хранения текста песни в формате LRC
}

export interface Album {
  _id: string;
  title: string;
  // ИЗМЕНЕНО: теперь массив объектов Artist (для удобства отображения)
  // или массив строк (для передачи ID на бэкенд)
  artist: Artist[]; // <-- Убедитесь, что это Artist[]
  imageUrl: string;
  releaseYear: number;
  songs: Song[];
  type: string;
  createdAt: string;
  updatedAt: string;
  addedAt?: string; // Сделаем опциональным, так как не всегда будет
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

// frontend/src/types/index.ts

export interface User {
  _id: string;
  firebaseUid: string;
  fullName: string;
  imageUrl: string;
  email: string;
  isAdmin?: boolean;
  playlists?: Playlist[];

  // --- НОВЫЕ ПОЛЯ ---
  followers: string[]; // Массивы ID
  followingUsers: string[];
  followingArtists: string[];

  // --- НОВЫЕ СЧЕТЧИКИ (приходят с бэкенда для страницы профиля) ---
  followersCount?: number;
  followingUsersCount?: number;
  followingArtistsCount?: number;
  publicPlaylistsCount?: number;
}

export interface SearchState {
  query: string;
  songs: Song[];
  albums: Album[];
  playlists: Playlist[];
  artists: Artist[]; // <-- ДОБАВЛЕНО: Артисты в результатах поиска
  users: User[]; // <-- НОВОЕ ПОЛЕ

  loading: boolean;
  error: string | null;
  setQuery: (q: string) => void;
  search: (q: string) => Promise<void>;
}

export interface UserLibrary {
  userId: string;
  likedSongs: Song[];
  albums: Album[];
}

export interface Playlist {
  _id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  owner: User;
  songs: Song[];
  type: "playlist";
  imageUrl?: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export interface BaseLibraryItem {
  _id: string;
  title: string;
  imageUrl?: string | null;
  createdAt: Date;
}

export interface LikedSongsItem extends BaseLibraryItem {
  type: "liked-songs";
  songsCount: number;
}

export interface AlbumItem extends BaseLibraryItem {
  type: "album";
  // ИЗМЕНЕНО: теперь массив объектов Artist, чтобы соответствовать Song и Album
  artist: Artist[];
  albumType?: string;
}
export interface PlaylistItem extends BaseLibraryItem {
  type: "playlist";
  owner: User;
}

export interface FollowedArtistItem extends BaseLibraryItem {
  // <-- НОВЫЙ ТИП
  type: "artist";
  artistId: string; // ID артиста
  addedAt?: string; // <-- ЭТУ СТРОКУ НУЖНО ДОБАВИТЬ/ПРОВЕРИТЬ
}

export type LibraryItem =
  | LikedSongsItem
  | AlbumItem
  | PlaylistItem
  | FollowedArtistItem; // <-- ОБНОВЛЕНО

export interface LibraryPlaylist extends Playlist {
  addedAt: string;
}
