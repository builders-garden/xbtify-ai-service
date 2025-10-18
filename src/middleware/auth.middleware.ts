import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import type { RequestWithRawBody } from "../types/index.js";
import { response } from "./response.js";

export const validateApiSecret = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const apiSecret = req.header("x-api-secret");

	const correctApiKey =
		req.originalUrl.includes("async-jobs") || req.originalUrl.includes("clan")
			? env.SHARED_API_KEY_WITH_NEXT
			: env.API_SECRET_KEY;

	if (!apiSecret || apiSecret !== correctApiKey) {
		res.status(401).json({
			error: "Unauthorized: Invalid or missing API secret key",
		});
	}

	next();
};

export const validateNeynarSecret = (
	req: RequestWithRawBody,
	_res: Response,
	next: NextFunction,
) => {
	if (
		env.NODE_ENV === "development" ||
		req.method === "GET" ||
		req.method === "OPTIONS" ||
		req.method === "HEAD"
	) {
		next();
		return;
	}

	const signature = req.header("X-Neynar-Signature");
	if (!signature) {
		console.log("Unauthorized: Invalid or missing signature or body");
		response.unauthorized({
			message: "Unauthorized: Invalid or missing signature or body",
		});
		return;
	}

	const hmac = createHmac("sha512", env.NEYNAR_WEBHOOK_SECRET);
	hmac.update(req.rawBody ?? "");
	const computedHex = hmac.digest("hex");
	let isValid = false;

	try {
		const a = Buffer.from(computedHex, "hex");
		const b = Buffer.from(signature, "hex");
		if (a.length !== b.length) return false;
		isValid = timingSafeEqual(a, b);
	} catch {
		isValid = false;
	}

	if (!isValid) {
		console.log("Unauthorized: Invalid signature");
		response.unauthorized({
			message: "Unauthorized: Invalid signature",
		});
		return;
	}

	next();
	return;
};
