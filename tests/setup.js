process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.PORT = process.env.PORT || '3001';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';

// Always isolate tests on a dedicated database (never the development DB).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:root@localhost:5432/messaging_test?schema=public';
