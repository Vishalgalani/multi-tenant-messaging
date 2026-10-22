export function success(res, { statusCode = 200, message = 'Success', data = null, meta = null }) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
}

export function created(res, { message = 'Resource created successfully', data = null, meta = null }) {
  return success(res, { statusCode: 201, message, data, meta });
}

export function noContent(res) {
  return res.status(204).send();
}
