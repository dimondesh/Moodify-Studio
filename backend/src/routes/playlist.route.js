// backend/src/routes/playlist.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createPlaylist,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  likePlaylist,
  unlikePlaylist,
  getMyPlaylists,
  getPublicPlaylists,
} from "../controller/playlist.controller.js";

const router = express.Router();

// Public routes
router.get("/public", getPublicPlaylists);

// Protected routes
router.use(protectRoute); // All routes below this will be protected

router.post("/", createPlaylist); // Create a new playlist
router.get("/my", getMyPlaylists); // Get all playlists for the authenticated user
router.get("/:id", getPlaylistById); // Get a specific playlist by ID
router.put("/:id", updatePlaylist); // Update a playlist
router.delete("/:id", deletePlaylist); // Delete a playlist

router.post("/:id/songs", addSongToPlaylist); // Add a song to a playlist
router.delete("/:playlistId/songs/:songId", removeSongFromPlaylist); // Remove a song from a playlist

router.post("/:id/like", likePlaylist); // Like a playlist
router.delete("/:id/unlike", unlikePlaylist); // Unlike a playlist (fixed route name)

export default router;
