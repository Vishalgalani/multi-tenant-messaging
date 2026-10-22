import { prisma } from '../../config/database.js';

export const messageRepository = {
  async findTenantById(tenantId, tx = prisma) {
    return tx.tenant.findUnique({
      where: { id: tenantId },
    });
  },

  async createMessage(data, tx = prisma) {
    return tx.message.create({ data });
  },

  async findByIdForTenant(messageId, tenantId, tx = prisma) {
    return tx.message.findFirst({
      where: {
        id: messageId,
        tenantId,
      },
    });
  },

  async findById(messageId, tx = prisma) {
    return tx.message.findUnique({
      where: { id: messageId },
    });
  },

  /**
   * Cursor pagination: chronological ascending (oldest first).
   * Cursor points to the last item from the previous page (createdAt + id).
   */
  async listByConversation({ tenantId, conversationId, limit, cursor }, tx = prisma) {
    const where = {
      tenantId,
      conversationId,
    };

    if (cursor) {
      where.OR = [
        { createdAt: { gt: cursor.createdAt } },
        {
          createdAt: cursor.createdAt,
          id: { gt: cursor.id },
        },
      ];
    }

    return tx.message.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
  },
};
