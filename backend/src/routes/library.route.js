import express from "express";
import {
  toggleAlbumInLibrary,
  getLibraryAlbums,
  getLikedSongs,
  toggleSongLikeInLibrary,
  getPlaylistsInLibrary,
  togglePlaylistInLibrary,
  toggleArtistInLibrary,
  getFollowedArtists,
  getSavedMixes,
  toggleMixInLibrary,
  getOwnedPlaylists,
  getSavedGeneratedPlaylists, // <-- ИМПОРТ
  toggleGeneratedPlaylistInLibrary, // <-- ИМПОРТ
} from "../controller/library.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/albums", protectRoute, getLibraryAlbums);
router.get("/liked-songs", protectRoute, getLikedSongs);
router.post("/albums/toggle", protectRoute, toggleAlbumInLibrary);
router.post("/songs/toggle-like", protectRoute, toggleSongLikeInLibrary);
router.get("/playlists", protectRoute, getPlaylistsInLibrary);
router.post("/playlists/toggle", protectRoute, togglePlaylistInLibrary);
router.post("/artists/toggle", protectRoute, toggleArtistInLibrary);
router.get("/artists", protectRoute, getFollowedArtists);
router.get("/mixes", protectRoute, getSavedMixes);
router.post("/mixes/toggle", protectRoute, toggleMixInLibrary);
router.get("/playlists/owned", protectRoute, getOwnedPlaylists);
router.get("/generated-playlists", protectRoute, getSavedGeneratedPlaylists); // <-- НОВЫЙ РОУТ
router.post(
  "/generated-playlists/toggle",
  protectRoute,
  toggleGeneratedPlaylistInLibrary
); // <-- НОВЫЙ РОУТ

export default router;
