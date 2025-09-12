// backend/src/routes/home.route.js

import { Router } from "express";
import { identifyUser } from "../middleware/identifyUser.middleware.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getPrimaryHomePageData,
  getSecondaryHomePageData,
  getBootstrapData, // <-- Новый контроллер
} from "../controller/home.controller.js";

const router = Router();

router.get("/bootstrap", protectRoute, getBootstrapData);

router.get("/primary", identifyUser, getPrimaryHomePageData);
router.get("/secondary", identifyUser, getSecondaryHomePageData);

export default router;
