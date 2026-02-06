import { redis } from '../db/redis.js';
import { askGroq } from '../ai/groq.js';
import { getOwnerStatus } from './presence.service.js';
import { delay } from '../utils/delay.js';
import { isWaReady } from '../whatsapp/client.js';
import { isOutsideWorkingHours } from '../utils/time.js';

/* =====================
   CONSTANTS
===================== */
const SPAM_LIMIT = 5;
const SPAM_WINDOW_MS = 10_000;

const AI_MODE_TIMEOUT_MS = 60 * 60 * 1000; // 1 jam
const OWNER_REPLY_TIMEOUT_MS = 60 * 60 * 1000; // 1 jam

const BOT_CREDIT = '\n\n_(dibalas oleh Bot)_';
const AI_CREDIT = '\n\n_(dibalas oleh AI)_';

/* =====================
   MAIN HANDLER
===================== */
export async function handleAutoReply(sock, msg, text) {
    const jid =
        msg.key.remoteJidAlt || msg.key.remoteJid;

    const now = Date.now();

    /* =====================
       BASIC GUARD
    ===================== */
    if (!isWaReady()) {
        await sock.sendMessage(jid, {
            text: 'Ilham lagi offline ya, nanti aku balas 🙏' + BOT_CREDIT
        });
        return;
    }

    if (isOutsideWorkingHours()) {
        await sock.sendMessage(jid, {
            text:
                'Ilham lagi di luar jam kerja ya 🙏\n' +
                'Nanti aktif lagi di jam kerja.' +
                BOT_CREDIT
        });
        return;
    }

    // ❌ GROUP
    if (jid.endsWith('@g.us')) {
        return;
    }

    // ❌ BROADCAST / STATUS
    if (
        jid === 'status@broadcast' ||
        jid.endsWith('@broadcast')
    ) {
        return;
    }

    // ❌ MESSAGE TANPA TEXT (system, reaction, dll)
    if (!text || typeof text !== 'string') {
        return;
    }

    // hanya chat pribadi
    if (
        !jid.endsWith('@s.whatsapp.net') &&
        !jid.endsWith('@lid')
    ) return;

    /* =====================
       LAST INTERACTION TIMEOUT
    ===================== */
    const lastInteractionAt =
        Number(await redis.get(`user:${jid}:last_interaction_at`)) || 0;

    if (
        lastInteractionAt &&
        now - lastInteractionAt > AI_MODE_TIMEOUT_MS
    ) {
        console.log('⏳ inactivity timeout → reset state');

        await redis.multi()
            .set(`user:${jid}:state`, 'normal')
            .del(`user:${jid}:owner_replied_at`)
            .del(`user:${jid}:msg_count`)
            .del(`user:${jid}:ai_credit_shown`)
            .exec();
    }

    await redis.set(`user:${jid}:last_interaction_at`, now);

    /* =====================
       OWNER REPLY TIMEOUT
    ===================== */
    const ownerRepliedAt =
        Number(await redis.get(`user:${jid}:owner_replied_at`)) || 0;

    if (
        ownerRepliedAt &&
        now - ownerRepliedAt <= OWNER_REPLY_TIMEOUT_MS
    ) {
        console.log('🙋 owner replied recently → bot off');
        return;
    }

    /* =====================
       OWNER PRESENCE
    ===================== */
    const ownerStatus = await getOwnerStatus();
    console.log('👤 owner status:', ownerStatus);
    if (ownerStatus === 'online') return;

    if (text.length < 2) return;

    await delay(1200);

    /* =====================
       SPAM DETECTION
    ===================== */
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
        await sock.sendMessage(jid, {
            text: 'jangan ngespam ya 🙏' + BOT_CREDIT
        });

        await redis.set(`user:${jid}:msg_count`, 0);
        return;
    }

    /* =====================
       STATE MACHINE
    ===================== */
    const state =
        (await redis.get(`user:${jid}:state`)) || 'normal';

    console.log('🤖 state:', state);

    /* 1️⃣ NORMAL */
    if (state === 'normal') {
        await sock.sendMessage(jid, {
            text:
                'Aku lagi offline.\n' +
                'Mau chat sama AI aku aja?\n' +
                'Kalau iya, balas *iya*.' +
                BOT_CREDIT
        });

        await redis.set(`user:${jid}:state`, 'offered_ai');
        return;
    }

    /* 2️⃣ OFFERED AI */
    if (state === 'offered_ai') {
        if (text.trim().toLowerCase() === 'iya') {
            await redis.set(`user:${jid}:state`, 'ai_mode');
            await redis.del(`user:${jid}:ai_credit_shown`);

            await sock.sendMessage(jid, {
                text: 'Oke 👍 kamu bisa tanya apa aja tentang aku.' + BOT_CREDIT
            });
        }
        return;
    }

    /* 3️⃣ AI MODE */
    if (state === 'ai_mode') {
        let reply;

        try {
            reply = await askGroq(
                `
Kamu adalah AI pribadi Ilham.
Gaya bicara kamu HARUS seperti ngobrol santai di WhatsApp.

KEPRIBADIAN:
- Ramah, santai, fun
- Manusiawi, bukan robot
- Boleh emoji ringan 😄
- Jangan kepanjangan

ATURAN:
- Hanya jawab tentang Ilham
- Jangan mengarang fakta
- Kalau di luar topik, jawab santai
- Jangan bilang kamu bot kecuali ditanya

CONTOH:
User: Ilham orangnya gimana?
AI: Santai tapi fokus 😄 Kalau kerja bisa serius, tapi ngobrol tetap enak.

SEKARANG JAWAB:
"${text}"
        `.trim()
            );
        } catch (err) {
            console.error('❌ Groq error:', err.message);
            reply =
                'Maaf ya, aku cuma bisa jawab hal-hal tentang Ilham 🙏';
        }

        // credit AI hanya muncul pertama kali
        const aiCreditShown =
            await redis.get(`user:${jid}:ai_credit_shown`);

        if (!aiCreditShown) {
            reply += AI_CREDIT;
            await redis.set(`user:${jid}:ai_credit_shown`, '1');
        }

        await delay(800);
        await sock.sendMessage(jid, { text: reply });
    }
}
