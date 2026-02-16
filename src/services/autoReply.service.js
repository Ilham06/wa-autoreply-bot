import { redis } from '../config/redis.js';
import { askGroq } from './groq.service.js';
import { getOwnerStatus } from './presence.service.js';
import { delay } from '../utils/delay.js';
import { isWaReady } from './whatsappClient.js';
import { isOutsideWorkingHours } from '../utils/time.js';
import { getActiveBotConfig } from './botConfig.service.js';

/* =====================
   MAIN HANDLER
===================== */
export async function handleAutoReply(sock, msg, text) {
    const jid =
        msg.key.remoteJidAlt || msg.key.remoteJid;

    const now = Date.now();

    /* =====================
       ✅ OWNER MANUAL REPLY (FIX)
       ⛔ JANGAN ADA LOGIC LAIN DI ATAS INI
    ===================== */
    if (msg.key.fromMe) {
        console.log('✋ Owner replied manually → bot off');

        await redis.multi()
            .set(`user:${jid}:owner_replied_at`, now)
            .set(`user:${jid}:state`, 'normal')
            .del(`user:${jid}:ai_credit_shown`)
            .exec();

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

    // ❌ MESSAGE TANPA TEXT
    if (!text || typeof text !== 'string') {
        return;
    }

    // hanya chat pribadi
    if (
        !jid.endsWith('@s.whatsapp.net') &&
        !jid.endsWith('@lid')
    ) return;

    let config;
    try {
        config = await getActiveBotConfig();
    } catch (err) {
        console.error('❌ Bot config missing:', err.message);
        return;
    }

    const setting = config.setting;
    const botCredit = setting.botCredit || '';
    const aiCredit = setting.aiCredit || '';

    /* =====================
       BASIC GUARD
    ===================== */
    if (!isWaReady()) {
        const hasAuth = !!sock?.authState?.creds?.me?.id;
        if (hasAuth) {
            await sock.sendMessage(jid, {
                text: setting.offlineReplyText + botCredit
            });
        }
        return;
    }

    if (isOutsideWorkingHours(
        setting.timezone,
        setting.offStartMinutes,
        setting.offEndMinutes
    )) {
        await sock.sendMessage(jid, {
            text: setting.outsideHoursReplyText + botCredit
        });
        return;
    }

    /* =====================
       LAST INTERACTION TIMEOUT
    ===================== */
    const lastInteractionAt =
        Number(await redis.get(`user:${jid}:last_interaction_at`)) || 0;

    if (
        lastInteractionAt &&
        now - lastInteractionAt > setting.aiModeTimeoutMs
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
        now - ownerRepliedAt <= setting.ownerReplyTimeoutMs
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

    if (now - lastMsgAt <= setting.spamWindowMs) {
        msgCount++;
    } else {
        msgCount = 1;
    }

    await redis.set(`user:${jid}:last_msg_at`, now);
    await redis.set(`user:${jid}:msg_count`, msgCount);

    if (msgCount >= setting.spamLimit) {
        await sock.sendMessage(jid, {
            text: setting.spamReplyText + botCredit
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
            text: setting.aiOfferText + botCredit
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
                text: setting.aiAcceptedText + botCredit
            });
        }
        return;
    }

    /* 3️⃣ AI MODE */
    if (state === 'ai_mode') {
        let reply;

        try {
            reply = await askGroq(text, {
                aiModel: setting.aiModel,
                aiTemperature: setting.aiTemperature,
                aiTopP: setting.aiTopP,
                aiMaxTokens: setting.aiMaxTokens,
                systemPrompt: setting.systemPrompt,
                sourceOfTruth: setting.sourceOfTruth,
                aiBehavior: setting.aiBehavior
            });
        } catch (err) {
            console.error('❌ Groq error:', err.message);
            reply =
                'Maaf ya, aku cuma bisa jawab hal-hal tentang Ilham 🙏';
        }

        const aiCreditShown =
            await redis.get(`user:${jid}:ai_credit_shown`);

        if (!aiCreditShown) {
            reply += aiCredit;
            await redis.set(`user:${jid}:ai_credit_shown`, '1');
        }

        await delay(800);
        await sock.sendMessage(jid, { text: reply });
    }
}
