import { redis } from '../db/redis.js';
import { handleAutoReply } from '../services/autoReply.service.js';

export async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJidAlt || msg.key.remoteJid;
  const fromMe = msg.key.fromMe;

  if (fromMe) {
    // tandai bahwa owner sudah ambil alih
    const now = Date.now();
    await redis.multi()
      .set(`user:${jid}:owner_replied_at`, now)
      .set(`user:${jid}:state`, 'normal')
      .del(`user:${jid}:ai_credit_shown`)
      .exec();
    return;
  }

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text;

  if (!text) return;

  console.log('📩', jid, text);

  await handleAutoReply(sock, msg, text);
}
