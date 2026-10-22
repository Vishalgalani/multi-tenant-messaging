import { z } from 'zod';
import { WEBHOOK_STATUSES } from '../../constants/messageStatus.js';

export const providerWebhookBodySchema = z
  .object({
    eventId: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'Invalid eventId format'),
    messageId: z.string().uuid('messageId must be a valid UUID'),
    status: z.enum(WEBHOOK_STATUSES),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
