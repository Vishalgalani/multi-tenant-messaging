import { Router } from 'express';
import { authenticateWebhook } from '../../middleware/authenticateWebhook.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { webhookController } from './webhook.controller.js';
import { providerWebhookBodySchema } from './webhook.validation.js';

const router = Router();

router.post(
  '/provider',
  authenticateWebhook,
  validateRequest({ body: providerWebhookBodySchema }),
  webhookController.provider,
);

export const webhookRouter = router;
