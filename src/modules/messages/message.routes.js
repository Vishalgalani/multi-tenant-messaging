import { Router } from 'express';
import { authenticateTenant } from '../../middleware/authenticateTenant.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { messageController } from './message.controller.js';
import {
  conversationParamsSchema,
  createMessageBodySchema,
  listMessagesQuerySchema,
  messageIdParamsSchema,
} from './message.validation.js';

const router = Router();

router.post(
  '/',
  authenticateTenant,
  validateRequest({ body: createMessageBodySchema }),
  messageController.create,
);

router.get(
  '/:messageId',
  authenticateTenant,
  validateRequest({ params: messageIdParamsSchema }),
  messageController.getById,
);

export const conversationMessageRouter = Router({ mergeParams: true });

conversationMessageRouter.get(
  '/',
  authenticateTenant,
  validateRequest({
    params: conversationParamsSchema,
    query: listMessagesQuerySchema,
  }),
  messageController.listByConversation,
);

export const messageRouter = router;
