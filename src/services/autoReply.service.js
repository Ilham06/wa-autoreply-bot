import { redis } from '../db/redis.js';
import { askGroq } from '../ai/groq.js';
import { getOwnerStatus } from './presence.service.js';
import { delay } from '../utils/delay.js';
import { isWaReady } from '../whatsapp/client.js';
import { isOutsideWorkingHours } from '../utils/time.js';

const SPAM_LIMIT = 5;
const SPAM_WINDOW_MS = 10_000; // 10 detik

const AI_MODE_TIMEOUT_MS = 60 * 60 * 1000; // 1 jam
const OWNER_REPLY_TIMEOUT_MS = 60 * 60 * 1000; // 1 jam

export async function handleAutoReply(sock, msg, text) {
    const jid =
        msg.key.remoteJidAlt || msg.key.remoteJid;

    const now = Date.now();

    /* =====================
       BASIC GUARD
    ====================== */
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

    // hanya chat pribadi
    if (
        !jid.endsWith('@s.whatsapp.net') &&
        !jid.endsWith('@lid')
    ) return;

    /* =====================
       LAST INTERACTION
    ====================== */
    const lastInteractionAt =
        Number(await redis.get(`user:${jid}:last_interaction_at`)) || 0;

    const inactiveTooLong =
        lastInteractionAt &&
        now - lastInteractionAt > AI_MODE_TIMEOUT_MS;

    if (inactiveTooLong) {
        console.log('⏳ inactivity timeout → reset states');

        await redis.multi()
            .set(`user:${jid}:state`, 'normal')
            .del(`user:${jid}:owner_replied_at`)
            .del(`user:${jid}:msg_count`)
            .exec();
    }

    // simpan interaction terbaru
    await redis.set(`user:${jid}:last_interaction_at`, now);

    /* =====================
       OWNER REPLY TIMEOUT
    ====================== */
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
    ====================== */
    const ownerStatus = await getOwnerStatus();
    console.log('👤 owner status:', ownerStatus);
    if (ownerStatus === 'online') return;

    // pesan terlalu pendek
    if (text.length < 2) return;

    await delay(1200);

    /* =====================
       SPAM DETECTION
    ====================== */
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

    /* 1️⃣ NORMAL */
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

    /* 2️⃣ OFFERED AI */
    if (state === 'offered_ai') {
        if (text.trim().toLowerCase() === 'iya') {
            await redis.set(`user:${jid}:state`, 'ai_mode');

            await sock.sendMessage(jid, {
                text: 'Oke 👍 kamu bisa tanya apa aja tentang aku.'
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
            Gaya bicara kamu HARUS seperti orang ngobrol santai di WhatsApp.
            
            KEPRIBADIAN KAMU:
            - Ramah, santai, fun
            - Jawaban terasa manusiawi, bukan robot
            - Kadang pakai emoji ringan , tapi jangan berlebihan
            - Boleh bercanda ringan kalau konteksnya cocok
            - Jangan terlalu panjang kecuali memang perlu
            
            ATURAN PENTING:
            - Kamu HANYA boleh menjawab hal-hal tentang Ilham
            - Kalau pertanyaan di luar topik Ilham, jawab dengan sopan dan santai
            - Jangan mengarang fakta
            - Jangan bilang kamu AI atau bot kecuali ditanya langsung
            
            TENTANG ILHAM:
            - Software engineer
            - Fokus backend, DevOps, automation
            - Suka bangun sistem sendiri & tools internal
            - Tipe orang yang suka efisiensi dan eksplor hal teknis
            
            CONTOH GAYA JAWABAN:
            User: Ilham orangnya kayak gimana?
            AI: Santai tapi fokus 😄 Kalau lagi ngoding bisa serius, tapi ngobrol tetap enak.
            
            User: Ilham jago frontend?
            AI: Lebih jago backend sih 😅 Tapi frontend tetap bisa kalau dibutuhin.
            
            User: Kamu siapa?
            AI: Aku bantu jawab soal Ilham aja ya 🙂
            
            SEKARANG JAWAB PERTANYAAN INI DENGAN GAYA OBROLAN:
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
