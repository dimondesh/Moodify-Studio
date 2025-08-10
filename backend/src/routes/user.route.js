// backend/src/routes/user.route.js

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
} from "../controller/user.controller.js";

const router = Router();

router.get("/me", protectRoute, getCurrentUser);
router.get("/messages/:userId", protectRoute, getMessages);


router.get("/mutuals", protectRoute, getMutualFollowers);

router.get("/:userId", protectRoute, getUserProfile);

router.post("/:userId/follow", protectRoute, followUser);

router.put("/me", protectRoute, updateUserProfile);

router.get("/", protectRoute, getAllUsers);

router.get("/:userId/followers", protectRoute, getFollowers);

router.get("/:userId/following", protectRoute, getFollowing);

router.get("/:userId/playlists", protectRoute, getPublicPlaylists);

router.put("/language", protectRoute, updateUserLanguage);

export default router;
