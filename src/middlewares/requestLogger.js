function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`;
    if (process.env.NODE_ENV !== 'test') {
      console.log(log);
    }
  });

  next();
}

module.exports = { requestLogger };
