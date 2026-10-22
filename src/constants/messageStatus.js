export const MESSAGE_STATUS = Object.freeze({
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
});

/** Forward progression ranks. FAILED is handled as a terminal side-path. */
export const STATUS_RANK = Object.freeze({
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
});

export const WEBHOOK_STATUSES = Object.freeze([
  MESSAGE_STATUS.SENT,
  MESSAGE_STATUS.DELIVERED,
  MESSAGE_STATUS.READ,
  MESSAGE_STATUS.FAILED,
]);

/**
 * Decide whether an incoming webhook status may update the message.
 *
 * Rules:
 * 1. Terminal states (READ, FAILED) never change again.
 * 2. FAILED may apply from QUEUED, SENT, or DELIVERED (not from READ).
 * 3. Otherwise the new status must strictly advance the forward rank
 *    (QUEUED < SENT < DELIVERED < READ). Equal or lower ranks are ignored.
 *
 * @param {string} currentStatus
 * @param {string} incomingStatus
 * @returns {{ allowed: boolean, reason: string }}
 */
export function evaluateStatusTransition(currentStatus, incomingStatus) {
  if (currentStatus === MESSAGE_STATUS.READ) {
    return {
      allowed: false,
      reason: 'Message already READ; status is terminal',
    };
  }

  if (currentStatus === MESSAGE_STATUS.FAILED) {
    return {
      allowed: false,
      reason: 'Message already FAILED; status is terminal',
    };
  }

  if (incomingStatus === MESSAGE_STATUS.FAILED) {
    return {
      allowed: true,
      reason: 'FAILED transition applied',
    };
  }

  const currentRank = STATUS_RANK[currentStatus];
  const incomingRank = STATUS_RANK[incomingStatus];

  if (currentRank === undefined || incomingRank === undefined) {
    return {
      allowed: false,
      reason: 'Unknown status value',
    };
  }

  if (incomingRank <= currentRank) {
    return {
      allowed: false,
      reason: `Out-of-order or non-advancing transition ignored (${currentStatus} -> ${incomingStatus})`,
    };
  }

  return {
    allowed: true,
    reason: `Advanced ${currentStatus} -> ${incomingStatus}`,
  };
}

/**
 * @param {string} status
 * @param {Date} occurredAt
 */
export function statusTimestampFields(status, occurredAt) {
  const fields = {
    status,
    statusUpdatedAt: occurredAt,
  };

  switch (status) {
    case MESSAGE_STATUS.SENT:
      fields.sentAt = occurredAt;
      break;
    case MESSAGE_STATUS.DELIVERED:
      fields.deliveredAt = occurredAt;
      break;
    case MESSAGE_STATUS.READ:
      fields.readAt = occurredAt;
      break;
    case MESSAGE_STATUS.FAILED:
      fields.failedAt = occurredAt;
      break;
    default:
      break;
  }

  return fields;
}
