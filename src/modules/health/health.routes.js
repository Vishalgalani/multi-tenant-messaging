import { Router } from 'express';
import { healthController } from './health.controller.js';

const router = Router();

router.get('/', healthController.check);

export const healthRouter = router;
