import { execSync } from 'node:child_process';
import { prisma } from '../../src/config/database.js';

export async function resetDatabase() {
  await prisma.webhookEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.tenant.deleteMany();
}

export function applyMigrations() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
}
