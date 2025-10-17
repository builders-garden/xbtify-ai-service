import { Request, Response } from "express";
import { fetchUserData } from "../services/user.service.js";

export const updateUserDataController = async (req: Request, res: Response) => {
  try {
    const result = await fetchUserData();
    res.status(200).json({
      status: "ok",
      data: result,
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({
      message: "Failed to update user data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
