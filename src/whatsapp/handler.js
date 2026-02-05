import { redis } from '../db/redis.js';
import { handleAutoReply } from '../services/autoReply.service.js';

export async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  const fromMe = msg.key.fromMe;

  if (msg.key.fromMe) {
    const jid =
      msg.key.remoteJidAlt || msg.key.remoteJid;
  
    // tandai bahwa owner sudah ambil alih
    await redis.set(`user:${jid}:owner_replied`, '1');
    return;
  }
  

  // abaikan pesan dari diri sendiri
  if (fromMe) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text;

  if (!text) return;

  console.log('📩', jid, text);

  await handleAutoReply(sock, msg, text);
}
