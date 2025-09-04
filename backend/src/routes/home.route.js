// backend/src/routes/home.route.js

import { Router } from "express";
import { identifyUser } from "../middleware/identifyUser.middleware.js";
import { getHomePageData } from "../controller/home.controller.js";

const router = Router();

router.get("/", identifyUser, getHomePageData);

export default router;
