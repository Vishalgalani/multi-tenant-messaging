import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction
      ? [{ emit: 'event', level: 'error' }]
      : [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

prisma.$on('error', (event) => {
  logger.error({ err: event }, 'Prisma error');
});

prisma.$on('warn', (event) => {
  logger.warn({ msg: event.message }, 'Prisma warning');
});

export async function connectDatabase() {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export async function checkDatabaseHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
