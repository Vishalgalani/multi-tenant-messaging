import { ApiError } from '../utils/ApiError.js';

/**
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export function validateRequest(schemas) {
  return (req, _res, next) => {
    const details = [];

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        details.push(...formatIssues('params', result.error.issues));
      } else {
        req.params = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        details.push(...formatIssues('query', result.error.issues));
      } else {
        req.query = result.data;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        details.push(...formatIssues('body', result.error.issues));
      } else {
        req.body = result.data;
      }
    }

    if (details.length > 0) {
      return next(ApiError.validation('Validation failed', details));
    }

    return next();
  };
}

function formatIssues(location, issues) {
  return issues.map((issue) => ({
    location,
    field: issue.path.join('.') || location,
    message: issue.message,
    code: issue.code,
  }));
}
