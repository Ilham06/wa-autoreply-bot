import { Router } from 'express';
import { getAdminStatus } from '../controllers/adminController.js';

const router = Router();

router.get('/status', getAdminStatus);

export default router;
