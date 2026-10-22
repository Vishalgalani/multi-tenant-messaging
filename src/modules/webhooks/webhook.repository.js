import { prisma } from '../../config/database.js';

export const webhookRepository = {
  async findByEventId(eventId, tx = prisma) {
    return tx.webhookEvent.findUnique({
      where: { eventId },
    });
  },

  async createEvent(data, tx = prisma) {
    return tx.webhookEvent.create({ data });
  },

  async lockMessage(messageId, tx) {
    const rows = await tx.$queryRaw`
      SELECT id, status, tenant_id AS "tenantId"
      FROM messages
      WHERE id = CAST(${messageId} AS uuid)
      FOR UPDATE
    `;
    return rows[0] ?? null;
  },

  async updateMessageStatus(messageId, fields, tx = prisma) {
    return tx.message.update({
      where: { id: messageId },
      data: fields,
    });
  },
};
