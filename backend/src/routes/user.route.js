import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";


const router = Router();

router.get("/like", protectRoute, (req, res) => {
    res.send("User route");
}
);

export default router;