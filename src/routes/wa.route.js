import express from 'express';
import { getLastQr, isWaReady, logoutWA, resetWA, startWA } from '../whatsapp/client.js';
import QRCode from 'qrcode';

const router = express.Router();

let waStarting = false;

router.post('/connect', async (req, res) => {
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
});

router.get('/qr', async (req, res) => {
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
});


router.post('/logout', async (req, res) => {
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
});

router.post('/reset', async (req, res) => {
  const result = await resetWA(req.app.locals.onMessage);
  res.json(result);
});


export default router;
