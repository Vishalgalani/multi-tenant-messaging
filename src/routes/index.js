import { Router } from 'express';
import {
  conversationMessageRouter,
  messageRouter,
} from '../modules/messages/message.routes.js';
import { webhookRouter } from '../modules/webhooks/webhook.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { tenantRouter } from '../modules/tenants/tenant.routes.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/api/v1/tenants', tenantRouter);
router.use('/api/v1/messages', messageRouter);
router.use('/api/v1/conversations/:conversationId/messages', conversationMessageRouter);
router.use('/api/v1/webhooks', webhookRouter);

export default router;
