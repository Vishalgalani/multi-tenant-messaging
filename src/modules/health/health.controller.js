import { checkDatabaseHealth } from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logger } from '../../utils/logger.js';

export const healthController = {
  check: asyncHandler(async (_req, res) => {
    let database = 'up';

    try {
      await checkDatabaseHealth();
    } catch (error) {
      database = 'down';
      logger.error({ err: error }, 'Health check database probe failed');
    }

    const healthy = database === 'up';

    return res.status(healthy ? 200 : 503).json({
      success: healthy,
      message: healthy ? 'Service is healthy' : 'Service is degraded',
      data: {
        status: healthy ? 'ok' : 'degraded',
        database,
        timestamp: new Date().toISOString(),
      },
      meta: null,
    });
  }),
};
