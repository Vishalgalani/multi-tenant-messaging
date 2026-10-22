import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * When WEBHOOK_SECRET is configured, require matching `x-webhook-secret`.
 * When unset (local/dev), requests are accepted without a secret.
 */
export function authenticateWebhook(req, _res, next) {
  if (!env.webhookSecretEnabled) {
    return next();
  }

  const provided = req.header('x-webhook-secret');
  if (!provided || provided !== env.WEBHOOK_SECRET) {
    return next(ApiError.unauthorized('Invalid or missing webhook secret'));
  }

  return next();
}
