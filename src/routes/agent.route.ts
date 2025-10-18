import express from "express";
import {
	handleAskAgentController,
	initAgentController,
	reinitializeAgentController,
} from "../controllers/agent.controller.js";
import { getNegativeImageAndUpload } from "../lib/image.js";

const router = express.Router();

router.post("/init", initAgentController);
router.post("/:fid/reinitialize", reinitializeAgentController);
router.post("/:fid/ask", handleAskAgentController);
router.get("/:fid/info", initAgentController);
router.post("/image/negative", async (req, res) => {
	try {
		const { imageUrl, filename } = req.body;
		if (!imageUrl) {
			return res.status(400).json({ error: "imageUrl is required" });
		}

		const imageLink = await getNegativeImageAndUpload(imageUrl, filename);
		return res.status(200).json({ imageUrl: imageLink });
	} catch (error) {
		console.error("Error processing image:", error);
		return res.status(500).json({ error: "Failed to process image" });
	}
});

export default router;
