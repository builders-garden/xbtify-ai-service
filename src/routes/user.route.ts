import express from "express";
import { updateUserDataController } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/fetch", updateUserDataController);

export default router;
