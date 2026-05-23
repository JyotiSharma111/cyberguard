/**
 * Centralised error handler — must be registered LAST in Express.
 * Catches anything passed via next(err).
 */
export function errorHandler(err, req, res, next) {
  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV !== 'production'

  console.error(`[API Error] ${req.method} ${req.path}`, {
    message: err.message,
    code:    err.code,
    stack:   isDev ? err.stack : '[hidden in production]'
  })

  const status = err.status ?? err.statusCode ?? 500

  res.status(status).json({
    ok:      false,
    error:   err.message ?? 'Internal server error',
    code:    err.code    ?? 'INTERNAL_ERROR',
    path:    req.path,
    ...(isDev && { stack: err.stack }),
  })
}

/**
 * 404 handler — must be registered before errorHandler.
 */
export function notFound(req, res) {
  console.warn(`[API 404] ${req.method} ${req.path}`)
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.path}`, code: 'NOT_FOUND' })
}
