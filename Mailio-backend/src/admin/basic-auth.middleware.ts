import { Request, Response, NextFunction } from 'express';

/**
 * Minimal HTTP Basic auth for the Bull Board route. Until the full admin-role
 * RBAC lands (Phase 3), this gates the queue dashboard behind ADMIN_USER /
 * ADMIN_PASS env vars. If either var is unset, the route is blocked entirely
 * (fail-closed) rather than left open.
 */
export function basicAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;

  if (!expectedUser || !expectedPass) {
    res.status(503).send('Admin dashboard disabled (ADMIN_USER / ADMIN_PASS not set)');
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Mailio Admin"');
    res.status(401).send('Authentication required');
    return;
  }

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  const user = sep === -1 ? decoded : decoded.slice(0, sep);
  const pass = sep === -1 ? '' : decoded.slice(sep + 1);

  if (user !== expectedUser || pass !== expectedPass) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Mailio Admin"');
    res.status(401).send('Invalid credentials');
    return;
  }

  next();
}
