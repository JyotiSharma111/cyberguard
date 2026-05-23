/**
 * Request logger middleware — logs every request with timing.
 */
export function requestLogger(req, res, next) {
  const start = Date.now()
  const { method, path, ip } = req

  res.on('finish', () => {
    const ms     = Date.now() - start
    const status = res.statusCode
    const color  = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
    const reset  = '\x1b[0m'
    console.log(`${color}[${status}]${reset} ${method} ${path} — ${ms}ms`)
  })

  next()
}
