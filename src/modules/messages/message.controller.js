import { created, success } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { messageService } from './message.service.js';

export const messageController = {
  create: asyncHandler(async (req, res) => {
    try {
      const data = await messageService.createMessage({
        authenticatedTenantId: req.tenantId,
        payload: req.body,
      });

      return created(res, {
        message: 'Message created successfully',
        data,
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          correlationId: req.correlationId,
          tenantId: req.tenantId,
        },
        'Create message request failed',
      );
      throw error;
    }
  }),

  getById: asyncHandler(async (req, res) => {
    try {
      const data = await messageService.getMessage({
        authenticatedTenantId: req.tenantId,
        messageId: req.params.messageId,
      });

      return success(res, {
        message: 'Message retrieved successfully',
        data,
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          correlationId: req.correlationId,
          tenantId: req.tenantId,
          messageId: req.params.messageId,
        },
        'Get message request failed',
      );
      throw error;
    }
  }),

  listByConversation: asyncHandler(async (req, res) => {
    try {
      const result = await messageService.listConversationMessages({
        authenticatedTenantId: req.tenantId,
        conversationId: req.params.conversationId,
        limit: req.query.limit,
        cursor: req.query.cursor,
      });

      return success(res, {
        message: 'Messages retrieved successfully',
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          correlationId: req.correlationId,
          tenantId: req.tenantId,
          conversationId: req.params.conversationId,
        },
        'List conversation messages request failed',
      );
      throw error;
    }
  }),
};
