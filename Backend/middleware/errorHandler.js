export default function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  const payload = { message: err.message || 'Internal Server Error' };
  if (!isProd && err.stack) payload.stack = err.stack;
  res.status(status).json(payload);
}
