import { prisma } from '../../config/database.js';

export const tenantRepository = {
  async create(name, tx = prisma) {
    // id is omitted so PostgreSQL gen_random_uuid() assigns it
    return tx.tenant.create({
      data: { name },
    });
  },

  async findById(tenantId, tx = prisma) {
    return tx.tenant.findUnique({
      where: { id: tenantId },
    });
  },

  async findByName(name, tx = prisma) {
    return tx.tenant.findFirst({
      where: { name },
    });
  },
};
