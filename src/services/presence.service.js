import { redis } from '../db/redis.js';

const OWNER_KEY = 'system:owner_status';

export async function setOwnerStatus(status) {
  await redis.set(OWNER_KEY, status);
}

export async function getOwnerStatus() {
  return (await redis.get(OWNER_KEY)) || 'offline';
}
