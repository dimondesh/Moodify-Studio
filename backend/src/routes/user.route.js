import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  getMessages,
  getCurrentUser,
} from "../controller/user.controller.js";
const router = Router();

router.get("/like", protectRoute, (req, res) => {
  res.send("User route");
});

router.get("/messages/:userId", protectRoute, getMessages);

router.get("/", protectRoute, getAllUsers);

router.get("/me", protectRoute, getCurrentUser);
export default router;
