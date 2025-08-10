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
  getGenres,
  getMoods,
} from "../controller/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protectRoute);

router.post("/songs", createSong);
router.put("/songs/:id", updateSong);
router.delete("/songs/:id", deleteSong);

router.post("/albums", createAlbum);
router.put("/albums/:id", updateAlbum);
router.delete("/albums/:id", deleteAlbum);
router.post("/albums/upload-full-album", uploadFullAlbumAuto);

router.post("/artists", createArtist);
router.put("/artists/:id", updateArtist);
router.delete("/artists/:id", deleteArtist);

router.get("/genres", getGenres);
router.get("/moods", getMoods);

export default router;
