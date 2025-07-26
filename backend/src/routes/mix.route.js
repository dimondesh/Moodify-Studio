import express from "express";
import { getDailyMixes, getMixById } from "../controller/mix.controller.js";

const router = express.Router();

// Роут для получения ежедневных миксов, доступен всем
router.get("/", getDailyMixes);
router.get("/:id", getMixById); // <-- ДОБАВЬТЕ ЭТОТ РОУТ

export default router;
