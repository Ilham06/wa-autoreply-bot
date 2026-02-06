import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

/**
 * GLOBAL STATE
 */
let sock = null;
let waReady = false;
let lastQr = null;

/**
 * FSM
 * idle | starting | waiting_qr | restarting | connected | disconnected
 */
let waState = 'idle';

/**
 * restart guard (khusus pairing)
 */
let restartedAfterPairing = false;

/* ========= GETTERS ========= */
export function isWaReady() {
  return waReady;
}

export function getLastQr() {
  return lastQr;
}

export function getWaState() {
  return waState;
}

/* ========= START WA ========= */
export async function startWA(onMessage) {
  if (
    waState === 'starting' ||
    waState === 'waiting_qr' ||
    waState === 'connected' ||
    waState === 'restarting'
  ) {
    console.log('⚠️ startWA ignored, state:', waState);
    return sock;
  }

  waState = 'starting';
  console.log('🚀 Starting WhatsApp socket...');

  const { state, saveCreds } = await useMultiFileAuthState('auth');

  sock = makeWASocket({
    auth: state,
    browser: ['Ubuntu', 'Chrome', '120'],
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    /* === QR === */
    if (qr) {
      waState = 'waiting_qr';
      lastQr = qr;

      console.log('📱 QR AVAILABLE — waiting for scan');
      qrcode.generate(qr, { small: true });
      return;
    }

    /* === CONNECTED === */
    if (connection === 'open') {
      waReady = true;
      waState = 'connected';
      lastQr = null;
      restartedAfterPairing = false;

      console.log('🟢 WA CONNECTED & READY');
      return;
    }

    /* === CLOSED === */
    if (connection === 'close') {
      waReady = false;

      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      console.log('🔴 WA CLOSED', statusCode);

      /* LOGGED OUT → STOP */
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('⚠️ Logged out — QR required');

        waState = 'disconnected';
        sock = null;
        lastQr = null;
        restartedAfterPairing = false;
        return;
      }

      /* PAIRING SUCCESS → RESTART ONCE */
      if (
        statusCode === 515 &&
        waState === 'waiting_qr' &&
        !restartedAfterPairing
      ) {
        console.log('🔁 Pairing done, restarting socket once...');

        restartedAfterPairing = true;
        waState = 'restarting';
        sock = null;
        lastQr = null;

        setTimeout(() => {
          waState = 'idle';      // 🔥 FIX UTAMA
          startWA(onMessage);
        }, 1500);

        return;
      }

      /* OTHER */
      console.log('⚠️ Disconnected, waiting manual reconnect');
      waState = 'disconnected';
      sock = null;
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg?.message) return;

    await onMessage(sock, msg);
  });

  return sock;
}

/* ========= LOGOUT ========= */
export async function logoutWA() {
  if (!sock) {
    return { success: false, message: 'WA not initialized' };
  }

  try {
    await sock.logout();

    sock = null;
    waReady = false;
    lastQr = null;
    waState = 'disconnected';
    restartedAfterPairing = false;

    console.log('👋 WA LOGGED OUT');

    return { success: true };
  } catch (err) {
    console.error('Logout WA error:', err);
    return { success: false, message: err.message };
  }
}
