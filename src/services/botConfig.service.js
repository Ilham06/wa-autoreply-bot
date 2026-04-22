import { prisma } from '../config/prisma.js';

const CACHE_TTL_MS = 5000;
let cachedConfig = null;
let cachedAt = 0;

export async function getActiveBotConfig() {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const config = await prisma.botConfig.findFirst({
    where: { isActive: true },
    include: { setting: true },
    orderBy: { createdAt: 'asc' }
  });

  if (!config || !config.setting) {
    throw new Error('Bot configuration not seeded');
  }

  cachedConfig = config;
  cachedAt = now;
  return config;
}

export function clearBotConfigCache() {
  cachedConfig = null;
  cachedAt = 0;
}
