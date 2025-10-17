import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export const validateApiSecret = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiSecret = req.header("x-api-secret");

  const correctApiKey =
    req.originalUrl.includes("async-jobs") || req.originalUrl.includes("clan")
      ? env.SHARED_API_KEY_WITH_NEXT
      : env.API_SECRET_KEY;

  if (!apiSecret || apiSecret !== correctApiKey) {
    return res.status(401).json({
      error: "Unauthorized: Invalid or missing API secret key",
    });
  }

  next();
};
