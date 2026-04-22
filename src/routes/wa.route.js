import express from 'express';
import {
  connectWa,
  getQr,
  logout,
  reset
} from '../controllers/waController.js';

const router = express.Router();

router.post('/connect', connectWa);
router.get('/qr', getQr);
router.post('/logout', logout);
router.post('/reset', reset);

export default router;
