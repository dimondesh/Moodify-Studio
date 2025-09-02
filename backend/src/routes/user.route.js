import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  getMessages,
  getCurrentUser,
  getUserProfile,
  followUser,
  updateUserProfile,
  getMutualFollowers,
  getFollowers,
  getFollowing,
  getPublicPlaylists,
  updateUserLanguage,
  getUnreadCounts,
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  updateUserPrivacy,
} from "../controller/user.controller.js";

const router = Router();

// --- СТАТИЧЕСКИЕ МАРШРУТЫ ---
router.get("/me", protectRoute, getCurrentUser);
router.get("/mutuals", protectRoute, getMutualFollowers);
router.get("/unread-counts", protectRoute, getUnreadCounts);
router.get("/me/recent-searches", protectRoute, getRecentSearches);
router.post("/me/recent-searches", protectRoute, addRecentSearch);
router.delete("/me/recent-searches/all", protectRoute, clearRecentSearches);
router.delete(
  "/me/recent-searches/:searchId",
  protectRoute,
  removeRecentSearch
);

// --- ДИНАМИЧЕСКИЕ МАРШРУТЫ ---
router.get("/messages/:userId", protectRoute, getMessages);
router.get("/:userId", protectRoute, getUserProfile);
router.post("/:userId/follow", protectRoute, followUser);
router.get("/:userId/followers", protectRoute, getFollowers);
router.get("/:userId/following", protectRoute, getFollowing);
router.get("/:userId/playlists", protectRoute, getPublicPlaylists);

router.put("/me", protectRoute, updateUserProfile);
router.get("/", protectRoute, getAllUsers);
router.put("/language", protectRoute, updateUserLanguage);
router.put("/privacy", protectRoute, updateUserPrivacy);
export default router;
