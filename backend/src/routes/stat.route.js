import { Router } from "express";

import { protectRoute } from "../middleware/auth.middleware.js"; //req adm
import { getStats } from "../controller/stat.controller.js";

const router = Router();

router.get("/", protectRoute, getStats); //req adm
export default router;
