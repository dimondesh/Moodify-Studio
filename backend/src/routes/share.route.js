import { Router } from "express";
import { getSharedEntity } from "../controller/share.controller.js";
// Защита не нужна, так как это просто получение публичной информации по ID
// import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:entityType/:entityId", getSharedEntity);

export default router;
