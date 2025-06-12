import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getAllUsers } from "../controller/user.controller.js";


const router = Router();

router.get("/like", protectRoute, (req, res) => {
    res.send("User route");
}
);

router.get("/", protectRoute, getAllUsers);

export default router;