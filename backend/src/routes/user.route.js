// backend/src/routes/user.route.js

import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  getMessages,
  getCurrentUser,
  // --- НОВЫЕ ИМПОРТЫ ---
  getUserProfile,
  followUser,
  updateUserProfile,
  getMutualFollowers,
} from "../controller/user.controller.js";

const router = Router();

// Существующие роуты
router.get("/me", protectRoute, getCurrentUser);
router.get("/messages/:userId", protectRoute, getMessages);

// --- НОВЫЕ РОУТЫ ---

// Роут для получения пользователей для чата (только взаимные подписки)
router.get("/mutuals", protectRoute, getMutualFollowers);

// Публичный профиль пользователя
router.get("/:userId", protectRoute, getUserProfile);

// Подписка/отписка от пользователя
router.post("/:userId/follow", protectRoute, followUser);

// Обновление профиля (имя, фото)
router.put("/me", protectRoute, updateUserProfile);

// Старый роут для получения ВСЕХ пользователей (можно оставить для админки или удалить)
router.get("/", protectRoute, getAllUsers);

export default router;
