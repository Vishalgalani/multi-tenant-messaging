import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import { tenantController } from './tenant.controller.js';
import { createTenantBodySchema } from './tenant.validation.js';

const router = Router();

router.post('/', validateRequest({ body: createTenantBodySchema }), tenantController.create);

export const tenantRouter = router;
