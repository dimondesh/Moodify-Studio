import express from "express";
import { getDailyMixes, getMixById } from "../controller/mix.controller.js";
import { identifyUser } from "../middleware/identifyUser.middleware.js";

const router = express.Router();

// Роут для получения ежедневных миксов, доступен всем
router.get("/", identifyUser, getDailyMixes); // <-- ИЗМЕНЕНИЕ
router.get("/:id", getMixById); // <-- ДОБАВЬТЕ ЭТОТ РОУТ

export default router;
