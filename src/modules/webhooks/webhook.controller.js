import { success } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { webhookService } from './webhook.service.js';

export const webhookController = {
  provider: asyncHandler(async (req, res) => {
    try {
      const data = await webhookService.handleProviderEvent(req.body);

      return success(res, {
        message: data.duplicate
          ? 'Duplicate event acknowledged'
          : data.applied
            ? 'Webhook event applied'
            : 'Webhook event accepted without status change',
        data,
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          correlationId: req.correlationId,
          eventId: req.body?.eventId,
          messageId: req.body?.messageId,
        },
        'Provider webhook request failed',
      );
      throw error;
    }
  }),
};
