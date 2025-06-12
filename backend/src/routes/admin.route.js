import { Router } from "express";
import {createSong,createAlbum, deleteAlbum,checkAdmin, deleteSong} from "../controller/admin.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protectRoute, requireAdmin);

router.post("/songs", createSong);
router.delete("/songs/:id",deleteSong);
router.post("/albums",createAlbum);
router.delete("/albums:id", deleteAlbum);
router.get("/check", checkAdmin);

export default router;