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

export interface UserLibrary {
  userId: string;
  likedSongs: string[]; // song._id[]
  likedAlbums: string[]; // album._id[]
}
