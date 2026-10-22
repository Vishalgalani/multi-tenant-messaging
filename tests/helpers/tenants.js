import { prisma } from '../../src/config/database.js';

/** Create tenants with DB-generated UUIDs for tests. */
export async function createTestTenants() {
  const tenantA = await prisma.tenant.create({ data: { name: 'Test Tenant A' } });
  const tenantB = await prisma.tenant.create({ data: { name: 'Test Tenant B' } });
  return { tenantA, tenantB };
}
