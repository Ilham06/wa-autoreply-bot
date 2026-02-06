import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';

/**
 * CONSTANT
 */
const AUTH_DIR = 'auth';

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

/* =====================
   GETTERS
===================== */
export function isWaReady() {
  return waReady;
}

export function getLastQr() {
  return lastQr;
}

export function getWaState() {
  return waState;
}

/* =====================
   INTERNAL HELPERS
===================== */
function clearAuth() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log('🧹 Auth folder cleared');
    }
  } catch (err) {
    console.error('❌ Failed to clear auth:', err);
  }
}

function resetRuntimeState() {
  sock = null;
  waReady = false;
  lastQr = null;
  waState = 'idle';
  restartedAfterPairing = false;
}

/* =====================
   START WA
===================== */
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

  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    browser: ['Ubuntu', 'Chrome', '120'],
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    /* === QR AVAILABLE === */
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

      /* === LOGGED OUT === */
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('⚠️ Logged out — QR required');

        resetRuntimeState();
        waState = 'disconnected';
        return;
      }

      /* === PAIRING SUCCESS → RESTART ONCE === */
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
          waState = 'idle';
          startWA(onMessage);
        }, 1500);

        return;
      }

      /* === OTHER DISCONNECT === */
      console.log('⚠️ Disconnected, waiting manual reconnect');

      resetRuntimeState();
      waState = 'disconnected';
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

/* =====================
   LOGOUT (MANUAL)
===================== */
export async function logoutWA() {
  if (!sock) {
    return { success: false, message: 'WA not initialized' };
  }

  try {
    await sock.logout();

    resetRuntimeState();
    clearAuth();

    waState = 'disconnected';
    console.log('👋 WA LOGGED OUT');

    return { success: true };
  } catch (err) {
    console.error('Logout WA error:', err);
    return { success: false, message: err.message };
  }
}

/* =====================
   RESET WA (FOR API)
===================== */
export async function resetWA(onMessage) {
  console.log('🔄 Resetting WhatsApp session...');

  resetRuntimeState();
  clearAuth();

  setTimeout(() => {
    startWA(onMessage);
  }, 1000);

  return {
    success: true,
    message: 'WhatsApp session reset. Scan QR again.'
  };
}
