import { Router } from "express";
import {
  getArtistById,
  getAllArtists,
} from "../controller/artist.controller.js";

const router = Router();

// Роут для получения всех артистов
router.get("/", getAllArtists);

// Роут для получения одного артиста по ID
router.get("/:id", getArtistById);

export default router;
