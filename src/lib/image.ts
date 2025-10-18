import ky from "ky";
import { imagekit } from "./imagekit.js";
import sharp from "sharp";


export async function getNegativeImageAndUpload(imageUrl: string, filename?: string): Promise<string> {
  // 1️⃣ fetch the image
    const response = await ky(imageUrl, { method: "GET" });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
  
  // 2️⃣ apply negative filter
  const inverted = await sharp(buffer).negate().toFormat("jpeg").toBuffer();

  // 3️⃣ upload to ImageKit
  const uploadResponse = await imagekit.upload({
    file: inverted,
    fileName: filename || `negative-${Date.now()}.jpeg`,
  });

  return uploadResponse.url;
}
