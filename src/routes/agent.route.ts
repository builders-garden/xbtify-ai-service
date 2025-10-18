import express from "express";
import {
  handleAskAgentController,
  initAgentController,
  reinitializeAgentController,
} from "../controllers/agent.controller.js";

const router = express.Router();

router.post("/init", initAgentController);
router.post("/:id/reinitialize", reinitializeAgentController);
router.post("/:id/ask", handleAskAgentController);
router.get("/:id/info", initAgentController);

export default router;
