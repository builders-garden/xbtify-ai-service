import { env } from "../config/env.js";
import IORedis from "ioredis";

const redis = new IORedis(env.REDIS_URL, {
  // this prevents BullMq from losing sync with Redis state
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

export const redisConnection = redis;
