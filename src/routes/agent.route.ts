import express from "express";
import {
	handleAskAgentController,
	initAgentController,
	reinitializeAgentController,
} from "../controllers/agent.controller.js";
import { getNegativeImageAndUpload } from "../lib/image.js";
import { getAgentByFid } from "../lib/database/queries/agent.query.js";
import ky from "ky";
import { env } from "../config/env.js";
import { createWalletClient, http } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { SiweMessage } from "siwe";

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
router.get("/:fid/signers/recovery", async (req, res) => {
	try {
		const { fid } = req.params;

		const agent = await getAgentByFid(Number(fid));
		if (!agent) {
			return res.status(404).json({ error: "Agent not found" });
		}

		if (!agent.mnemonic) {
			return res.status(400).json({ error: "Agent mnemonic not found" });
		}

		// Derive wallet from mnemonic
		const account = mnemonicToAccount(agent.mnemonic);
		const walletClient = createWalletClient({
			account,
			chain: mainnet,
			transport: http(),
		});

		const address = account.address;

		// Step 1: Fetch nonce from Neynar
		console.log("=== Step 1: Fetching nonce from Neynar ===");
		const nonceResponse = await ky.get("https://api.neynar.com/v2/farcaster/login/nonce", {
			headers: {
				"x-api-key": env.NEYNAR_API_KEY,
			},
		}).json<{ nonce: string }>();

		const nonce = nonceResponse.nonce;
		console.log("Nonce received:", nonce);

		// Step 2: Create SIWE message using the siwe package
		console.log("=== Step 2: Creating SIWE message ===");
		const siweMessage = new SiweMessage({
			domain: "neynar.com",
			address: address,
			statement: "Sign in to continue.",
			uri: "https://neynar.com",
			version: "1",
			chainId: 1,
			nonce: nonce,
			issuedAt: new Date().toISOString(),
		});

		const messageToSign = siweMessage.prepareMessage();
		console.log("SIWE message:", messageToSign);

		// Step 3: Sign the message
		console.log("=== Step 3: Signing message ===");
		const signature = await walletClient.signMessage({
			message: messageToSign,
		});
		console.log("Signature:", signature);

		// Step 4: Fetch signers from Neynar using the signed message
		console.log("=== Step 4: Fetching signers from Neynar ===");
		try {
			const response = await ky.get("https://api.neynar.com/v2/farcaster/signer/list/", {
				searchParams: {
					message: messageToSign, // Use the prepared message string
					signature: signature,
				},
				headers: {
					"x-api-key": env.NEYNAR_API_KEY,
				},
			});

			console.log("Neynar response status:", response.status);

			const responseData = await response.json<{
				signers: Array<{
					object: string;
					signer_uuid: string;
					public_key: string;
					status: string;
					signer_approval_url?: string;
					fid: number;
					permissions: string[];
				}>;
			}>();

			return res.status(200).json({
				signers: responseData.signers,
				// Include these for debugging/verification purposes
				message: messageToSign,
				signature: signature,
				nonce: nonce,
				address: address,
			});
		} catch (neynarError: any) {
			console.error("=== Neynar API Error ===");
			console.error("Error:", neynarError);
			
			// Try to extract error details from ky HTTPError
			if (neynarError.response) {
				const status = neynarError.response.status;
				console.error("Response status:", status);
				
				try {
					const errorBody = await neynarError.response.text();
					console.error("Response body:", errorBody);
					
					return res.status(status).json({ 
						error: "Failed to fetch signers from Neynar",
						details: errorBody,
						status: status,
						message: messageToSign,
						signature: signature,
						address: address,
					});
				} catch (parseError) {
					console.error("Could not parse error response:", parseError);
				}
			}
			
			return res.status(500).json({ 
				error: "Failed to fetch signers from Neynar",
				details: neynarError.message || "Unknown error",
				message: messageToSign,
				signature: signature,
				address: address,
			});
		}
	} catch (error: any) {
		console.error("=== General Error ===");
		console.error("Error fetching signer UUID:", error);
		console.error("Error message:", error.message);
		console.error("Error stack:", error.stack);
		return res.status(500).json({ 
			error: "Failed to fetch signer UUID",
			details: error.message || "Unknown error",
		});
	}
});

export default router;
