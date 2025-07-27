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
  getFollowers,
  getFollowing,
  getPublicPlaylists,
  updateUserLanguage,
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

router.get("/:userId/followers", protectRoute, getFollowers);

// Получить подписки пользователя (юзеры + артисты)
router.get("/:userId/following", protectRoute, getFollowing);

// Получить публичные плейлисты пользователя
router.get("/:userId/playlists", protectRoute, getPublicPlaylists);

router.put("/language", protectRoute, updateUserLanguage);

export default router;
