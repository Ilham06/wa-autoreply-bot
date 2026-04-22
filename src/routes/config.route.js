import { Router } from 'express';
import { authentication } from '../middleware/authentication.js';
import { getConfig, updateConfig } from '../controllers/configController.js';

const router = Router();

router.get('/', authentication, getConfig);
router.put('/', authentication, updateConfig);

export default router;
