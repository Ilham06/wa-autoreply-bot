import { prisma } from '../config/prisma.js';
import { clearBotConfigCache } from './botConfig.service.js';

const DEFAULT_SETTING = {
  timezone: 'Asia/Jakarta',
  offStartMinutes: 20 * 60 + 30,
  offEndMinutes: 10 * 60,
  spamLimit: 5,
  spamWindowMs: 10_000,
  aiModeTimeoutMs: 60 * 60 * 1000,
  ownerReplyTimeoutMs: 60 * 60 * 1000,
  aiModel: 'llama-3.1-8b-instant',
  aiTemperature: 0.6,
  aiTopP: 0.9,
  aiMaxTokens: null,
  allowEmoji: true,
  emojiStyle: 'light',
  systemPrompt:
    'Kamu adalah AI pribadi Ilham Muhamad.\n' +
    'Tugas kamu adalah menjawab pertanyaan orang seolah-olah mereka sedang ngobrol santai tentang Ilham di WhatsApp.\n\n' +
    '📌 SUMBER KEBENARAN:\n' +
    'Gunakan informasi di bawah ini sebagai SATU-SATUNYA sumber fakta tentang Ilham.\n' +
    'JANGAN menambah, mengarang, atau mengasumsikan hal di luar data ini.',
  sourceOfTruth:
    'IDENTITAS DASAR:\n' +
    'Nama: Ilham Muhamad\n' +
    'Usia: 25 tahun\n' +
    'Asal: Trenggalek, Jawa Timur\n' +
    'Domisili: Bendungan Hilir, Jakarta\n\n' +
    'PENDIDIKAN:\n' +
    '- Teknik Informatika\n' +
    '- Perguruan Tinggi Indonesia Mandiri, Bandung\n\n' +
    'PEKERJAAN:\n' +
    '- Mobile Developer di FTL Gym\n\n' +
    'PENGALAMAN:\n' +
    '- Mulai terjun di dunia software engineering sejak 2022\n' +
    '- Total pengalaman sekitar 4 tahun\n\n' +
    'KESEHARIAN:\n' +
    '- Aktivitas utama sehari-hari berkaitan dengan pekerjaan dan pengembangan diri\n' +
    '- Terbiasa menghabiskan waktu dengan laptop dan gadget\n' +
    '- Lebih nyaman dengan rutinitas yang rapi dan terstruktur\n' +
    '- Cenderung fokus kalau sedang mengerjakan sesuatu\n\n' +
    'KARAKTER & KEPRIBADIAN:\n' +
    '- Santai dan tidak ribet\n' +
    '- Lebih suka hal yang praktis dan efisien\n' +
    '- Tidak terlalu banyak bicara, tapi responsif kalau diajak ngobrol\n' +
    '- Bisa serius saat kerja, tapi tetap ramah dan sopan\n' +
    '- Lebih suka ngobrol apa adanya daripada terlalu formal\n\n' +
    'GAYA BERINTERAKSI:\n' +
    '- Lebih nyaman dengan percakapan santai\n' +
    '- Tidak suka basa-basi berlebihan\n' +
    '- Menghargai waktu dan kejelasan',
  aiBehavior:
    '🎭 GAYA BICARA:\n' +
    '- Santai, ramah, dan natural\n' +
    '- Terasa seperti manusia, bukan bot\n' +
    '- Boleh pakai emoji ringan kalau cocok 🙂😄👍\n' +
    '- Jawaban singkat sampai sedang (1–3 kalimat)\n' +
    '- Jangan terlalu formal\n' +
    '- Jangan pakai bullet point di jawaban\n\n' +
    '📌 ATURAN PENTING:\n' +
    '- Jawab secara UMUM dulu (kepribadian, keseharian, kerja, asal)\n' +
    '- Teknologi hanya dibahas jika memang ditanya\n' +
    '- Kalau ditanya hal yang TIDAK ADA di data, jawab santai bahwa informasinya belum ada\n' +
    '- Jangan menyebut kata “profil”, “data”, atau “berdasarkan informasi”\n' +
    '- Jangan bilang kamu AI kecuali ditanya langsung\n\n' +
    '🗣️ CONTOH GAYA JAWABAN:\n' +
    'User: Ilham orangnya kayak gimana?\n' +
    'Jawaban: Santai dan simpel orangnya 🙂 Kalau kerja bisa fokus, tapi ngobrol tetap enak.\n\n' +
    'User: Ilham kesehariannya ngapain?\n' +
    'Jawaban: Kebanyakan fokus kerja dan ngembangin diri sih. Lebih suka rutinitas yang rapi dan jelas.\n\n' +
    'User: Ilham hobi apa?\n' +
    'Jawaban: Soal itu aku belum punya infonya 😄\n\n' +
    'SEKARANG JAWAB PERTANYAAN INI DENGAN GAYA OBROLAN:',
  offlineReplyText: 'Ilham lagi offline ya, nanti aku balas 🙏',
  outsideHoursReplyText:
    'Ilham lagi di luar jam kerja ya 🙏\nNanti aktif lagi di jam kerja.',
  spamReplyText: 'jangan ngespam ya 🙏',
  aiOfferText:
    'Aku lagi offline.\nMau chat sama AI aku aja?\nKalau iya, balas *iya*.',
  aiAcceptedText: 'Oke 👍 kamu bisa tanya apa aja tentang aku.',
  botCredit: '\n\n_(dibalas oleh Bot)_',
  aiCredit: '\n\n_(dibalas oleh AI)_'
};

function omitUndefined(input) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

export async function getOrCreateUserConfig(userId) {
  const existing = await prisma.botConfig.findFirst({
    where: { userId },
    include: { setting: true }
  });

  if (existing?.setting) {
    return existing;
  }

  const base = await prisma.botConfig.findFirst({
    where: { userId: null, name: 'default' },
    include: { setting: true }
  });

  const settingData = base?.setting
    ? {
        timezone: base.setting.timezone,
        offStartMinutes: base.setting.offStartMinutes,
        offEndMinutes: base.setting.offEndMinutes,
        spamLimit: base.setting.spamLimit,
        spamWindowMs: base.setting.spamWindowMs,
        aiModeTimeoutMs: base.setting.aiModeTimeoutMs,
        ownerReplyTimeoutMs: base.setting.ownerReplyTimeoutMs,
        aiModel: base.setting.aiModel,
        aiTemperature: base.setting.aiTemperature,
        aiTopP: base.setting.aiTopP,
        aiMaxTokens: base.setting.aiMaxTokens,
        allowEmoji: base.setting.allowEmoji,
        emojiStyle: base.setting.emojiStyle,
        systemPrompt: base.setting.systemPrompt,
        sourceOfTruth: base.setting.sourceOfTruth,
        aiBehavior: base.setting.aiBehavior,
        offlineReplyText: base.setting.offlineReplyText,
        outsideHoursReplyText: base.setting.outsideHoursReplyText,
        spamReplyText: base.setting.spamReplyText,
        aiOfferText: base.setting.aiOfferText,
        aiAcceptedText: base.setting.aiAcceptedText,
        botCredit: base.setting.botCredit,
        aiCredit: base.setting.aiCredit
      }
    : DEFAULT_SETTING;

  return prisma.botConfig.create({
    data: {
      userId,
      name: base?.name || 'default',
      isActive: true,
      setting: {
        create: settingData
      }
    },
    include: { setting: true }
  });
}

export async function updateUserConfig(userId, payload) {
  const config = await getOrCreateUserConfig(userId);

  const botUpdate = omitUndefined({
    name: payload?.bot?.name,
    isActive: payload?.bot?.isActive
  });

  const settingUpdate = omitUndefined({
    timezone: payload?.setting?.timezone,
    offStartMinutes: payload?.setting?.offStartMinutes,
    offEndMinutes: payload?.setting?.offEndMinutes,
    spamLimit: payload?.setting?.spamLimit,
    spamWindowMs: payload?.setting?.spamWindowMs,
    aiModeTimeoutMs: payload?.setting?.aiModeTimeoutMs,
    ownerReplyTimeoutMs: payload?.setting?.ownerReplyTimeoutMs,
    aiModel: payload?.setting?.aiModel,
    aiTemperature: payload?.setting?.aiTemperature,
    aiTopP: payload?.setting?.aiTopP,
    aiMaxTokens: payload?.setting?.aiMaxTokens,
    allowEmoji: payload?.setting?.allowEmoji,
    emojiStyle: payload?.setting?.emojiStyle,
    systemPrompt: payload?.setting?.systemPrompt,
    sourceOfTruth: payload?.setting?.sourceOfTruth,
    aiBehavior: payload?.setting?.aiBehavior,
    offlineReplyText: payload?.setting?.offlineReplyText,
    outsideHoursReplyText: payload?.setting?.outsideHoursReplyText,
    spamReplyText: payload?.setting?.spamReplyText,
    aiOfferText: payload?.setting?.aiOfferText,
    aiAcceptedText: payload?.setting?.aiAcceptedText,
    botCredit: payload?.setting?.botCredit,
    aiCredit: payload?.setting?.aiCredit
  });

  const updated = await prisma.botConfig.update({
    where: { id: config.id },
    data: {
      ...botUpdate,
      setting: {
        update: settingUpdate
      }
    },
    include: { setting: true }
  });

  clearBotConfigCache();
  return updated;
}
