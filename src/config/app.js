import 'dotenv/config';

export const env = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  groqKey: process.env.GROQ_API_KEY,
  frontendUrl: process.env.FRONTEND_URL
};
