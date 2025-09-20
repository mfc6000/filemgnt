function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Unexpected server error';
  const details = err.details;

  const payload = {
    code,
    message,
  };

  if (details && typeof details === 'object') {
    payload.details = details;
  }

  res.status(status).json({
    error: payload,
  });
}

module.exports = { errorHandler };
