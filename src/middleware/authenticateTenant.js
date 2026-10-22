import { ApiError } from '../utils/ApiError.js';
import { isUuid } from '../utils/ids.js';

/**
 * Exercise assumption: `x-tenant-id` stands in for an authenticated tenant claim
 * (e.g. JWT `sub` / tenant scope). Production would verify a signed token instead.
 * Tenant IDs are UUIDs.
 */
export function authenticateTenant(req, _res, next) {
  try {
    const tenantId = req.header('x-tenant-id')?.trim();

    if (!tenantId) {
      return next(ApiError.unauthorized('Missing x-tenant-id header'));
    }

    if (!isUuid(tenantId)) {
      return next(ApiError.validation('Invalid x-tenant-id header; must be a UUID'));
    }

    req.tenantId = tenantId;
    return next();
  } catch (error) {
    return next(error);
  }
}
