import { Router } from "express";
import {
  createSong,
  updateSong,
  deleteSong,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  createArtist,
  updateArtist,
  deleteArtist,
} from "../controller/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
// import upload from "../middleware/multerUpload.js"; // <-- УДАЛИТЕ ЭТУ СТРОКУ

const router = Router();

// Применяем middleware protectRoute для всех админских роутов
router.use(protectRoute);

// --- Роуты для песен ---
router.post(
  "/songs",
  // upload.fields([{ name: "audioFile" }, { name: "imageFile" }]), // <-- УДАЛИТЕ ЭТОТ MIDDLEWARE
  createSong
);
router.put(
  "/songs/:id",
  // upload.fields([{ name: "audioFile" }, { name: "imageFile" }]), // <-- УДАЛИТЕ ЭТОТ MIDDLEWARE
  updateSong
);
router.delete("/songs/:id", deleteSong);

// --- Роуты для альбомов ---
router.post(
  "/albums",
  // upload.single("imageFile"), // <-- УДАЛИТЕ ЭТОТ MIDDLEWARE
  createAlbum
);
router.put(
  "/albums/:id",
  // upload.single("imageFile"), // <-- УДАЛИТЕ ЭТОТ MIDDLEWARE
  updateAlbum
);
router.delete("/albums/:id", deleteAlbum);

// --- Роуты для артистов ---
router.post(
  "/artists",
  // upload.single("imageFile"), // <-- УДАЛИТЕ ЭТОТ MIDDLEWARE
  createArtist
);
router.put(
  "/artists/:id",
  // upload.single("imageFile"), // <-- УДАЛИТЕ ЭТОТ MIDDLEWARE
  updateArtist
);
router.delete("/artists/:id", deleteArtist);

export default router;
