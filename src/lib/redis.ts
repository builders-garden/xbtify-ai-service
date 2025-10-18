import { Redis } from "ioredis";
import { env } from "../config/env.js";

//  (enable double stack lookup using family=0 for railway internal dns)
const redis = new Redis(`${env.REDIS_URL}?family=0`, {
	// this prevents BullMq from losing sync with Redis state
	maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
	console.error("Redis error:", err);
});

export const redisConnection = redis;
