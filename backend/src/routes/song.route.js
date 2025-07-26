import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getAllSongs,
  getFeaturedSongs,
  getListenHistory,
  getMadeForYouSongs,
  getTrendingSongs,
  recordListen,
} from "../controller/song.controller.js";

const router = Router();

router.get("/", protectRoute, getAllSongs);
router.get("/featured", getFeaturedSongs);
router.get("/made-for-you", protectRoute, getMadeForYouSongs);
router.get("/trending", getTrendingSongs);
router.post("/:id/listen", protectRoute, recordListen);
router.get("/history", protectRoute, getListenHistory);

export default router;
