import { redis } from '../db/redis.js';
import { askGroq } from '../ai/groq.js';
import { getOwnerStatus } from './presence.service.js';
import { delay } from '../utils/delay.js';
import { isWaReady } from '../whatsapp/client.js';
import { isOutsideWorkingHours } from '../utils/time.js';

const SPAM_LIMIT = 5;
const SPAM_WINDOW_MS = 10_000; // 10 detik

export async function handleAutoReply(sock, msg, text) {
    const jid =
        msg.key.remoteJidAlt || msg.key.remoteJid;
        
    if (!isWaReady()) {
        await sock.sendMessage(jid, {
            text: 'Ilham lagi offline ya, nanti aku balas 🙏'
        });
        return;
    }

    if (isOutsideWorkingHours()) {
        await sock.sendMessage(jid, {
          text:
            'Ilham lagi di luar jam kerja ya 🙏\n' +
            'Nanti aktif lagi di jam kerja.'
        });
        return;
      }


    const ownerReplied =
        await redis.get(`user:${jid}:owner_replied`);

    if (ownerReplied) {
        console.log('🙋 owner already replied, bot off');
        return;
    }


    await delay(1200);

    

    // hanya chat pribadi
    if (
        !jid.endsWith('@s.whatsapp.net') &&
        !jid.endsWith('@lid')
    ) return;

    // cek owner status
    const ownerStatus = await getOwnerStatus();
    console.log('👤', ownerStatus);
    if (ownerStatus === 'online') return;

    // pesan terlalu pendek
    if (text.length < 2) return;

    /* =====================
       SPAM DETECTION
    ====================== */
    const now = Date.now();
    const lastMsgAt =
        Number(await redis.get(`user:${jid}:last_msg_at`)) || 0;
    let msgCount =
        Number(await redis.get(`user:${jid}:msg_count`)) || 0;

    if (now - lastMsgAt <= SPAM_WINDOW_MS) {
        msgCount++;
    } else {
        msgCount = 1;
    }

    await redis.set(`user:${jid}:last_msg_at`, now);
    await redis.set(`user:${jid}:msg_count`, msgCount);

    if (msgCount >= SPAM_LIMIT) {
        console.log('🚨 spam detected');
        await sock.sendMessage(jid, {
            text: 'jangan ngespam ya 🙏'
        });
        await redis.set(`user:${jid}:msg_count`, 0);
        return;
    }

    /* =====================
       STATE MACHINE
    ====================== */
    const state =
        (await redis.get(`user:${jid}:state`)) || 'normal';
    console.log('🤖 state:', state);

    // 1️⃣ First auto reply
    if (state === 'normal') {
        await sock.sendMessage(jid, {
            text:
                'Aku lagi offline.\n' +
                'Mau chat sama AI aku aja?\n' +
                'Kalau iya, balas *iya*.'
        });

        await redis.set(`user:${jid}:state`, 'offered_ai');
        return;
    }

    // 2️⃣ Waiting confirmation
    if (state === 'offered_ai') {
        if (text.trim().toLowerCase() === 'iya') {
            await redis.set(`user:${jid}:state`, 'ai_mode');
            await sock.sendMessage(jid, {
                text: 'Oke 👍 kamu bisa tanya apa aja tentang aku.'
            });
        }
        return;
    }

    // 3️⃣ AI MODE
    if (state === 'ai_mode') {
        let reply;

        try {
            reply = await askGroq(
                `
Kamu adalah AI pribadi Ilham.

Aturan:
- HANYA jawab pertanyaan tentang Ilham
- Kalau di luar topik, jawab sopan bahwa kamu hanya bisa menjawab tentang Ilham
- Jawaban singkat, santai, manusiawi

Tentang Ilham:
Ilham adalah software engineer.
Fokus backend, DevOps, automation.
Suka bangun sistem sendiri dan tools internal.

Pertanyaan:
"${text}"
        `.trim()
            );
        } catch (err) {
            console.error('❌ Groq error:', err.message);
            reply =
                'Maaf ya, aku cuma bisa jawab hal-hal tentang Ilham 🙏';
        }

        await delay(800);
        await sock.sendMessage(jid, { text: reply });
    }
}
