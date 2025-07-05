import { Router } from "express";
// Импортируем новую функцию
import { syncUserWithDb } from "../controller/auth.controller.js";
const router = Router();

// Маршрут теперь использует новую, безопасную логику
router.post("/sync", syncUserWithDb);

export default router;
