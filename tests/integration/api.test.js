import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { disconnectDatabase, prisma } from '../../src/config/database.js';
import { applyMigrations, resetDatabase } from '../helpers/db.js';
import { createTestTenants } from '../helpers/tenants.js';

const app = createApp();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Messaging API', () => {
  let tenantA;
  let tenantB;

  beforeAll(() => {
    applyMigrations();
  });

  beforeEach(async () => {
    await resetDatabase();
    ({ tenantA, tenantB } = await createTestTenants());
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('creates a tenant with a database-generated UUID', async () => {
    const res = await request(app).post('/api/v1/tenants').send({ name: 'Acme Corp' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toMatch(UUID_RE);
    expect(res.body.data.name).toBe('Acme Corp');
  });

  it('creates a message in QUEUED status and retrieves it', async () => {
    const createRes = await request(app)
      .post('/api/v1/messages')
      .set('x-tenant-id', tenantA.id)
      .send({
        tenantId: tenantA.id,
        conversationId: 'conv-100',
        to: '+919876543210',
        text: 'Your Order has shipped',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.status).toBe('QUEUED');
    expect(createRes.body.data.id).toMatch(UUID_RE);
    expect(createRes.body.data.tenantId).toBe(tenantA.id);

    const messageId = createRes.body.data.id;

    const getRes = await request(app)
      .get(`/api/v1/messages/${messageId}`)
      .set('x-tenant-id', tenantA.id);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(messageId);
    expect(getRes.body.data.status).toBe('QUEUED');
  });

  it('rejects invalid create payloads with 400', async () => {
    const res = await request(app)
      .post('/api/v1/messages')
      .set('x-tenant-id', tenantA.id)
      .send({
        tenantId: tenantA.id,
        conversationId: 'conv-100',
        to: 'not-a-phone',
        text: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects non-UUID tenant headers', async () => {
    const res = await request(app)
      .post('/api/v1/messages')
      .set('x-tenant-id', 'tenant-a')
      .send({
        tenantId: tenantA.id,
        conversationId: 'conv-100',
        to: '+919876543210',
        text: 'bad tenant header',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('enforces tenant isolation on message reads', async () => {
    const createRes = await request(app)
      .post('/api/v1/messages')
      .set('x-tenant-id', tenantA.id)
      .send({
        tenantId: tenantA.id,
        conversationId: 'conv-100',
        to: '+919876543210',
        text: 'Secret to tenant A',
      });

    const messageId = createRes.body.data.id;

    const forbidden = await request(app)
      .get(`/api/v1/messages/${messageId}`)
      .set('x-tenant-id', tenantB.id);

    expect(forbidden.status).toBe(404);
  });

  it('handles duplicate webhook eventId idempotently', async () => {
    const createRes = await request(app)
      .post('/api/v1/messages')
      .set('x-tenant-id', tenantA.id)
      .send({
        tenantId: tenantA.id,
        conversationId: 'conv-100',
        to: '+919876543210',
        text: 'Idempotency check',
      });

    const messageId = createRes.body.data.id;
    const payload = {
      eventId: 'evt-001',
      messageId,
      status: 'DELIVERED',
      occurredAt: '2026-10-16T08:30:00.000Z',
    };

    const first = await request(app).post('/api/v1/webhooks/provider').send(payload);
    expect(first.status).toBe(200);
    expect(first.body.data.applied).toBe(true);
    expect(first.body.data.duplicate).toBe(false);
    expect(first.body.data.id).toMatch(UUID_RE);

    const second = await request(app).post('/api/v1/webhooks/provider').send(payload);
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    const eventCount = await prisma.webhookEvent.count({ where: { eventId: 'evt-001' } });
    expect(eventCount).toBe(1);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    expect(message.status).toBe('DELIVERED');
  });

  it('ignores out-of-order status transitions without moving backwards', async () => {
    const createRes = await request(app)
      .post('/api/v1/messages')
      .set('x-tenant-id', tenantA.id)
      .send({
        tenantId: tenantA.id,
        conversationId: 'conv-100',
        to: '+919876543210',
        text: 'Out of order',
      });

    const messageId = createRes.body.data.id;

    await request(app)
      .post('/api/v1/webhooks/provider')
      .send({
        eventId: 'evt-read',
        messageId,
        status: 'READ',
        occurredAt: '2026-10-16T08:40:00.000Z',
      });

    const late = await request(app)
      .post('/api/v1/webhooks/provider')
      .send({
        eventId: 'evt-late-sent',
        messageId,
        status: 'SENT',
        occurredAt: '2026-10-16T08:20:00.000Z',
      });

    expect(late.status).toBe(200);
    expect(late.body.data.applied).toBe(false);
    expect(late.body.data.messageStatus).toBe('READ');

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    expect(message.status).toBe('READ');
  });

  it('returns 404 for webhook events targeting unknown messages', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/provider')
      .send({
        eventId: 'evt-missing',
        messageId: '00000000-0000-4000-8000-000000000000',
        status: 'SENT',
        occurredAt: '2026-10-16T08:30:00.000Z',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('paginates conversation messages in stable chronological order', async () => {
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/api/v1/messages')
        .set('x-tenant-id', tenantA.id)
        .send({
          tenantId: tenantA.id,
          conversationId: 'conv-100',
          to: '+919876543210',
          text: `Message ${i}`,
        });
    }

    const page1 = await request(app)
      .get('/api/v1/conversations/conv-100/messages')
      .query({ limit: 2 })
      .set('x-tenant-id', tenantA.id);

    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta.hasMore).toBe(true);
    expect(page1.body.meta.nextCursor).toBeTruthy();
    expect(page1.body.data[0].text).toBe('Message 0');
    expect(page1.body.data[1].text).toBe('Message 1');

    const page2 = await request(app)
      .get('/api/v1/conversations/conv-100/messages')
      .query({ limit: 2, cursor: page1.body.meta.nextCursor })
      .set('x-tenant-id', tenantA.id);

    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.data[0].text).toBe('Message 2');
    expect(page2.body.meta.hasMore).toBe(false);
  });

  it('reports health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('up');
  });
});
