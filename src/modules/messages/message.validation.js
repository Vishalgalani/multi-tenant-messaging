import { z } from 'zod';

const tenantIdSchema = z.string().uuid('tenantId must be a valid UUID');

const conversationIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'Invalid conversationId format');

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^\+[1-9]\d{7,18}$/, 'to must be an E.164 phone number (e.g. +919876543210)');

export const createMessageBodySchema = z
  .object({
    tenantId: tenantIdSchema,
    conversationId: conversationIdSchema,
    to: phoneSchema,
    text: z.string().trim().min(1).max(4096),
  })
  .strict();

export const messageIdParamsSchema = z
  .object({
    messageId: z.string().uuid('messageId must be a valid UUID'),
  })
  .strict();

export const conversationParamsSchema = z
  .object({
    conversationId: conversationIdSchema,
  })
  .strict();

export const listMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
  .strict();
