import { created } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { tenantService } from './tenant.service.js';

export const tenantController = {
  create: asyncHandler(async (req, res) => {
    try {
      const data = await tenantService.createTenant({ name: req.body.name });

      return created(res, {
        message: 'Tenant created successfully',
        data,
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          correlationId: req.correlationId,
        },
        'Create tenant request failed',
      );
      throw error;
    }
  }),
};
