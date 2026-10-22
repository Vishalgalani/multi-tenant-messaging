import { randomUUID } from 'node:crypto';

export function correlationId(req, res, next) {
  const incoming = req.header('x-correlation-id')?.trim();
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.correlationId = id;
  res.setHeader('x-correlation-id', id);
  next();
}
