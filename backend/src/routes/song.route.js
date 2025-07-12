import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getAllSongs,
  getFeaturedSongs,
  getMadeForYouSongs,
  getTrendingSongs,
  incrementPlayCount,
} from "../controller/song.controller.js";

const router = Router();

router.get("/", protectRoute, getAllSongs);
router.get("/featured", getFeaturedSongs);
router.get("/made-for-you", getMadeForYouSongs);
router.get("/trending", getTrendingSongs);
router.post("/:songId/play", protectRoute, incrementPlayCount); // Защищаем маршрут

export default router;
