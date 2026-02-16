import fs from 'fs';
import path from 'path';
import { startWA } from './client.js';

const AUTH_DIR = 'auth';

export async function resetWA(onMessage) {
  console.log('🔄 Resetting WhatsApp session...');

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    } else {
      for (const entry of fs.readdirSync(AUTH_DIR)) {
        fs.rmSync(path.join(AUTH_DIR, entry), {
          recursive: true,
          force: true
        });
      }
    }
    console.log('🧹 Auth folder cleared');
  } catch (err) {
    console.error('❌ Failed to remove auth', err);
    throw err;
  }

  // start ulang → QR muncul
  setTimeout(() => {
    startWA(onMessage);
  }, 1000);

  return {
    success: true,
    message: 'WhatsApp session reset. Scan QR again.'
  };
}
