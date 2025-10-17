import Redlock from "redlock";
import { redisConnection } from "./redis.js";

const redlock = new Redlock([redisConnection], {
  retryCount: 20,
  retryDelay: 200,
});

export async function withUserLock<T>(
  fid: number,
  fn: () => Promise<T>
): Promise<T> {
  const resource = `lock:user:${fid}`;
  const ttl = 5000; // lock expires in 5s
  const lock = await redlock.acquire([resource], ttl);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}
