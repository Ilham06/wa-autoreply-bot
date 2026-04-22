import {
  getLastQr,
  isWaReady,
  logoutWA,
  resetWA,
  startWA
} from '../services/whatsappClient.js';
import QRCode from 'qrcode';

let waStarting = false;

export async function connectWa(req, res) {
  if (isWaReady()) {
    return res.json({
      success: true,
      message: 'WhatsApp already connected'
    });
  }

  if (waStarting) {
    return res.json({
      success: true,
      message: 'WhatsApp is starting, waiting for QR'
    });
  }

  try {
    waStarting = true;

    await startWA(async () => {
      // dummy handler, real handler sudah ada di app.js
    });

    res.json({
      success: true,
      message: 'WhatsApp starting, scan QR'
    });
  } catch (err) {
    waStarting = false;
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to start WhatsApp'
    });
  }
}

export async function getQr(req, res) {
  if (isWaReady()) {
    return res.status(200).send('WhatsApp already connected');
  }

  const qr = getLastQr();

  if (!qr) {
    return res.status(200).send('QR not available (already authenticated)');
  }

  const image = await QRCode.toBuffer(qr, {
    type: 'png',
    width: 320
  });

  res.setHeader('Content-Type', 'image/png');
  res.send(image);
}

export async function logout(req, res) {
  if (!isWaReady()) {
    return res.status(400).json({
      success: false,
      message: 'WhatsApp not connected'
    });
  }

  const result = await logoutWA();

  if (!result.success) {
    return res.status(500).json(result);
  }

  res.json({
    success: true,
    message: 'WhatsApp logged out'
  });
}

export async function reset(req, res) {
  const result = await resetWA(req.app.locals.onMessage);
  res.json(result);
}
