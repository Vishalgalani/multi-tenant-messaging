import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { tenantRepository } from './tenant.repository.js';

function rethrowServiceError(error, fallbackMessage) {
  if (error instanceof ApiError) {
    throw error;
  }

  logger.error({ err: error }, fallbackMessage);
  throw ApiError.internal(fallbackMessage, error);
}

export const tenantService = {
  async createTenant({ name }) {
    try {
      const existing = await tenantRepository.findByName(name);
      if (existing) {
        throw ApiError.conflict('Tenant name already exists', { name });
      }

      const tenant = await tenantRepository.create(name);

      logger.info({ tenantId: tenant.id, name: tenant.name }, 'Tenant created');

      return {
        id: tenant.id,
        name: tenant.name,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      };
    } catch (error) {
      rethrowServiceError(error, 'Failed to create tenant');
    }
  },

  async requireTenant(tenantId) {
    try {
      const tenant = await tenantRepository.findById(tenantId);
      if (!tenant) {
        throw ApiError.notFound('Tenant not found');
      }
      return tenant;
    } catch (error) {
      rethrowServiceError(error, 'Failed to load tenant');
    }
  },
};
