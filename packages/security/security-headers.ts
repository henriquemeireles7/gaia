// packages/security/security-headers.ts — applies the OWASP-recommended
// baseline of response headers. Composed by both protectedRoute and
// publicRoute so every shipped endpoint has them.
//
// Headers applied:
//   - X-Content-Type-Options: nosniff (prevent MIME sniffing)
//   - X-Frame-Options: DENY (prevent clickjacking)
//   - Referrer-Policy: strict-origin-when-cross-origin
//   - Strict-Transport-Security: HSTS, 1 year, includeSubDomains
//   - Content-Security-Policy: minimal default; tighten per-app

// Accepts Elysia's `set` object whose `headers` allows string|number values.
type ResponseSetLike = { headers: Record<string, string | number> }

export function applySecurityHeaders(set: ResponseSetLike): void {
  set.headers['X-Content-Type-Options'] = 'nosniff'
  set.headers['X-Frame-Options'] = 'DENY'
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
  set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  set.headers['Content-Security-Policy'] = "default-src 'self'; frame-ancestors 'none'"
}
