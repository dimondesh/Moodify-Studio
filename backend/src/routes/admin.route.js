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
  uploadFullAlbumAuto,
} from "../controller/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
// import upload from "../middleware/multerUpload.js"; // <-- ЭТО УЖЕ БЫЛО УДАЛЕНО

const router = Router();

// Применяем middleware protectRoute для всех админских роутов
// router.use(protectRoute);

// --- Роуты для песен ---
// ИЗМЕНЕНО: Multer middleware теперь не указывается здесь,
// предполагая, что express-fileupload или аналогичный уже настроен глобально
router.post("/songs", createSong);
router.put("/songs/:id", updateSong);
router.delete("/songs/:id", deleteSong);

// --- Роуты для альбомов ---
router.post("/albums", createAlbum);
router.put("/albums/:id", updateAlbum);
router.delete("/albums/:id", deleteAlbum);
router.post("/albums/upload-full-album", uploadFullAlbumAuto); // <-- НОВЫЙ РОУТ

// --- Роуты для артистов ---
router.post("/artists", createArtist);
router.put("/artists/:id", updateArtist);
router.delete("/artists/:id", deleteArtist);

export default router;
