const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor) {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!parsed?.createdAt || !parsed?.id || !isUuid(parsed.id)) {
      return null;
    }
    return {
      createdAt: new Date(parsed.createdAt),
      id: String(parsed.id),
    };
  } catch {
    return null;
  }
}
