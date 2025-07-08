import express from "express";
import {
  toggleAlbumInLibrary,
  getLibraryAlbums,
  getLikedSongs,
  toggleSongLikeInLibrary,
  getPlaylistsInLibrary, // <-- НОВОЕ: Импортируем контроллер
  togglePlaylistInLibrary,
  // <-- НОВОЕ: Импортируем контроллер
} from "../controller/library.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/albums", protectRoute, getLibraryAlbums);
router.get("/liked-songs", protectRoute, getLikedSongs);
router.post("/albums/toggle", protectRoute, toggleAlbumInLibrary);
router.post("/songs/toggle-like", protectRoute, toggleSongLikeInLibrary);
router.get("/playlists", protectRoute, getPlaylistsInLibrary); // Получить плейлисты пользователя в библиотеке
router.post("/playlists/toggle", protectRoute, togglePlaylistInLibrary); // Добавить/удалить плейлист из библиотеки

export default router;
