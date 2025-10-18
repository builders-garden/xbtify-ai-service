import express from "express";
import { neynarWebhookController } from "../controllers/neynar.controller.js";

const router = express.Router();

router.get("/webhooks", (_req, res) => {
	res.json({ status: "ok" });
});
router.options("/webhooks", (_req, res) => {
	res.json({ status: "ok" });
});
router.head("/webhooks", (_req, res) => {
	res.json({ status: "ok" });
});

// POST /api/v1/neynar/webhooks
router.post("/webhooks", neynarWebhookController);

export default router;
