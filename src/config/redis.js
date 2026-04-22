import Redis from 'ioredis';
import { env } from './app.js';

export const redis = new Redis(env.redisUrl);

redis.on('connect', () => {
  console.log('⚡ Redis connected');
});
