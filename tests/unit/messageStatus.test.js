import { describe, expect, it } from 'vitest';
import {
  evaluateStatusTransition,
  MESSAGE_STATUS,
} from '../../src/constants/messageStatus.js';

describe('evaluateStatusTransition', () => {
  it('allows forward progression', () => {
    expect(evaluateStatusTransition(MESSAGE_STATUS.QUEUED, MESSAGE_STATUS.SENT).allowed).toBe(
      true,
    );
    expect(evaluateStatusTransition(MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED).allowed).toBe(
      true,
    );
    expect(evaluateStatusTransition(MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.READ).allowed).toBe(
      true,
    );
  });

  it('rejects backwards and equal transitions', () => {
    expect(evaluateStatusTransition(MESSAGE_STATUS.READ, MESSAGE_STATUS.SENT).allowed).toBe(false);
    expect(
      evaluateStatusTransition(MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.SENT).allowed,
    ).toBe(false);
    expect(
      evaluateStatusTransition(MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.DELIVERED).allowed,
    ).toBe(false);
  });

  it('treats FAILED and READ as terminal', () => {
    expect(evaluateStatusTransition(MESSAGE_STATUS.FAILED, MESSAGE_STATUS.SENT).allowed).toBe(
      false,
    );
    expect(evaluateStatusTransition(MESSAGE_STATUS.READ, MESSAGE_STATUS.FAILED).allowed).toBe(
      false,
    );
    expect(evaluateStatusTransition(MESSAGE_STATUS.SENT, MESSAGE_STATUS.FAILED).allowed).toBe(
      true,
    );
  });
});
