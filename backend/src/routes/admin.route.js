import { Router } from "express";
import {
  createSong,
  createAlbum,
  deleteAlbum,
  deleteSong,
} from "../controller/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
const router = Router();

router.post("/songs", protectRoute, createSong);
router.delete("/songs/:id", protectRoute, deleteSong);
router.post("/albums", protectRoute, createAlbum);
router.delete("/albums/:id", protectRoute, deleteAlbum);

export default router;
