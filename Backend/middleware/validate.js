import { ZodError } from 'zod';

export default function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({ ...req.body, ...req.params, ...req.query });

      const newBody = {};
      const newParams = {};
      const newQuery = {};

      for (const key of Object.keys(parsed)) {
        if (req.body && typeof req.body === 'object' && req.body[key] !== undefined) {
          newBody[key] = parsed[key];
        } else if (req.params && typeof req.params === 'object' && req.params[key] !== undefined) {
          newParams[key] = parsed[key];
        } else if (req.query && typeof req.query === 'object' && req.query[key] !== undefined) {
          newQuery[key] = parsed[key];
        } else {
          if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
            newBody[key] = parsed[key];
          } else if (req.query && typeof req.query === 'object') {
            newQuery[key] = parsed[key];
          } else if (req.body && typeof req.body === 'object') {
            newBody[key] = parsed[key];
          }
        }
      }

      if (req.body && typeof req.body === 'object') req.body = newBody;
      if (req.params && typeof req.params === 'object') req.params = newParams;
      if (req.query && typeof req.query === 'object') req.query = newQuery;

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: 'Validation error', issues: err.errors.map((e) => ({ path: e.path, message: e.message })) });
      }
      return next(err);
    }
  };
}
