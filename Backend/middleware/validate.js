import { ZodError } from 'zod';

export default function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse({ ...req.body, ...req.params, ...req.query });
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: 'Validation error', issues: err.errors.map((e) => ({ path: e.path, message: e.message })) });
      }
      return next(err);
    }
  };
}
