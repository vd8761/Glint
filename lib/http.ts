/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HTTP security middleware: headers, CORS, rate limiting, authentication,
 * authorization, and a error handler that does not leak internals.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from './env.js';
import { pool } from './db.js';
import { logger } from './logger.js';
import { hashIp, safeCompare, isAdminRole, isSuperAdminRole, type Role } from './security.js';

// -----------------------------------------------------------------------------
// Request typing
// -----------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  workspaceId: string | null;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

/** The real client address, honouring the single proxy hop we trust. */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function clientIpHash(req: Request): string | null {
  return hashIp(clientIp(req));
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

/** An error whose message is safe to return to the caller. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Express 4 does not catch rejected promises from async handlers; an unhandled
 * rejection there hangs the request until the client times out. Every async
 * route is wrapped in this.
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Terminal error handler.
 *
 * Only `HttpError` messages reach the client. Everything else becomes a generic
 * 500 — the previous code returned `err.message` straight from Postgres, which
 * happily discloses table names, column names, and constraint definitions.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  const ref = Math.random().toString(36).slice(2, 10);
  logger.error(`Unhandled error [ref=${ref}] on ${req.method} ${req.path}`, err);
  res.status(500).json({ error: 'Internal server error', ref });
}

// -----------------------------------------------------------------------------
// Security headers
// -----------------------------------------------------------------------------

const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

/**
 * Content Security Policy.
 *
 * `script-src 'self'` with no CDN hosts and no `'unsafe-inline'`: the three
 * jsPDF/html2canvas/html2pdf `<script>` tags that used to load from cdnjs and
 * jsdelivr — unpinned, without Subresource Integrity — are gone. They are now
 * npm dependencies bundled by Vite. A compromise of either CDN would have meant
 * arbitrary JavaScript on the public certificate page.
 *
 * `img-src` allows `data:` and `blob:` because logos, signatures, and the
 * locally-generated QR code are data URIs, and html2canvas renders to a blob.
 *
 * Vite's dev server needs inline scripts and a websocket for HMR, so the policy
 * is relaxed outside production only.
 */
export function securityHeaders(): RequestHandler {
  const scriptSrc = env.isProd
    ? ["'self'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  const connectSrc = env.isProd ? ["'self'"] : ["'self'", 'ws:', 'wss:'];

  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': scriptSrc,
        // Google Fonts is imported from src/index.css. React's inline `style`
        // props are set via the CSSOM and are not covered by style-src.
        'style-src': ["'self'", "'unsafe-inline'", ...FONT_HOSTS],
        'font-src': ["'self'", 'data:', ...FONT_HOSTS],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'connect-src': connectSrc,
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': env.isProd ? [] : null,
      },
    },
    // Certificate pages are meant to be linked from LinkedIn and email clients.
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Helmet defaults to SAMEORIGIN, which contradicts `frame-ancestors 'none'`
    // above. Old browsers honour the weaker header; make both say the same thing.
    frameguard: { action: 'deny' },
    hsts: env.isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
  });
}

/**
 * CORS. The browser app is served from the same origin as the API, so no
 * cross-origin access is needed by default and none is granted. Additional
 * origins must be named explicitly in ALLOWED_ORIGINS — never reflected back
 * from the request.
 *
 * The request's own origin must be allowed. `<script type="module">` is fetched
 * in CORS mode even same-origin, so the browser sends `Origin` on it — and
 * Vite's production build emits `<script type="module" crossorigin>`. Rejecting
 * a same-origin `Origin` header means the app's own JavaScript bundle 403s and
 * nothing renders.
 */
export function corsMiddleware(): RequestHandler {
  const configured = env.allowedOrigins;

  return cors((req, callback) => {
    const origin = req.headers.origin;

    // No Origin: curl, server-to-server, and plain same-origin navigations.
    if (!origin) {
      callback(null, { origin: true, credentials: false, maxAge: 600 });
      return;
    }

    const host = req.headers.host;
    const selfOrigins = host
      ? [`http://${host}`, `https://${host}`]
      : [];

    const allowed = origin === env.appUrl || selfOrigins.includes(origin) || configured.includes(origin);

    if (!allowed) {
      logger.warn('Blocked cross-origin request', { origin, path: req.url });
    }

    callback(null, {
      origin: allowed ? origin : false,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    });
  });
}

// -----------------------------------------------------------------------------
// Rate limiting
// -----------------------------------------------------------------------------

/**
 * `ipKeyGenerator` normalises IPv6 to a /56 prefix. Keying on the raw address
 * lets anyone with an IPv6 allocation — which is every consumer ISP customer —
 * sidestep the limit by incrementing the host portion.
 */
const byIp = (req: Request) => ipKeyGenerator(clientIp(req));

interface LimiterOpts {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}

function limiter({ windowMs, max, message, skipSuccessfulRequests }: LimiterOpts) {
  return rateLimit({
    windowMs,
    limit: max,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: byIp,
    // Rate limits are a safety net, not the security boundary. In tests they
    // only get in the way.
    skip: () => env.isTest,
    handler: (_req, res) => {
      res.status(429).json({ error: message });
    },
  });
}

/** Broad backstop across the whole API surface. */
export const globalLimiter = limiter({
  windowMs: 60_000,
  max: 300,
  message: 'Too many requests. Slow down.',
});

/**
 * Credential stuffing defence. `skipSuccessfulRequests` means a user who keeps
 * logging in successfully is never throttled, while an attacker grinding
 * passwords burns the budget after 10 failures.
 */
export const authLimiter = limiter({
  windowMs: 15 * 60_000,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts. Try again in 15 minutes.',
});

export const registerLimiter = limiter({
  windowMs: 60 * 60_000,
  max: 5,
  message: 'Too many accounts created from this address.',
});

/**
 * Guards forgot-password and reset-password. Tight because both mint or consume
 * account-takeover material: forgot-password sends reset mail (a spam and
 * enumeration-timing vector) and reset-password grinds tokens. Not skipping
 * successful requests — a valid reset is rare, so there is no legitimate reason
 * to hit this endpoint often.
 */
export const passwordResetLimiter = limiter({
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many password reset requests. Try again in 15 minutes.',
});

/** Unauthenticated, publicly linked, and therefore a scraping target. */
export const publicReadLimiter = limiter({
  windowMs: 60_000,
  max: 60,
  message: 'Too many requests for this certificate.',
});

/**
 * The counter-increment endpoint. It was unauthenticated and unthrottled, so
 * anyone could inflate a workspace's view/download/share analytics with a shell
 * loop. This does not make the counters trustworthy — it makes them expensive
 * to forge.
 */
export const statsLimiter = limiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many statistics events.',
});

/** Signature verification is a cryptographic operation on a public endpoint. */
export const verifyLimiter = limiter({
  windowMs: 60_000,
  max: 15,
  message: 'Too many verification attempts.',
});

/** Gemini calls cost money per request. */
export const aiLimiter = limiter({
  windowMs: 60_000,
  max: 10,
  message: 'AI generation rate limit reached.',
});

/** Bulk issuance writes rows and enqueues mail. */
export const issuanceLimiter = limiter({
  windowMs: 60_000,
  max: 10,
  message: 'Too many issuance requests.',
});

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------

interface TokenPayload {
  sub: string;
  tv: number;
}

export function issueToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, tv: tokenVersion } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_TTL,
    issuer: 'glint',
    audience: 'glint-api',
  } as jwt.SignOptions);
}

/**
 * Verifies the bearer token, then loads the user.
 *
 * The token carries only a subject and a token version — never the role or the
 * workspace. Those used to be baked into the JWT, which meant a demoted admin
 * kept admin rights for up to seven days, and a user moved between workspaces
 * kept access to the old one. Authorization data is read from the database on
 * every request so a change takes effect immediately.
 *
 * `token_version` gives us revocation: bumping the column invalidates every
 * token that user is holding.
 */
export const authenticate: RequestHandler = (req: AuthedRequest, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'glint',
      audience: 'glint-api',
      algorithms: ['HS256'], // never let the token choose; `alg: none` is a classic bypass
    }) as TokenPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  pool
    .query<{
      id: string;
      email: string;
      name: string;
      role: Role;
      workspace_id: string | null;
      token_version: number;
    }>(
      'SELECT id, email, name, role, workspace_id, token_version FROM users WHERE id = $1',
      [payload.sub],
    )
    .then((result) => {
      const row = result.rows[0];
      if (!row || row.token_version !== payload.tv) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      req.user = {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        workspaceId: row.workspace_id,
      };
      next();
    })
    .catch(next);
};

/**
 * Platform operator or above. Determined by `users.role`, not by an email
 * literal. A super_admin is a strict superset of an admin, so it passes here
 * too — admin routes (workspace/program management, issuer creation) are open
 * to both tiers.
 */
export const requireAdmin: RequestHandler = (req: AuthedRequest, res, next) => {
  if (isAdminRole(req.user?.role)) {
    next();
    return;
  }
  res.status(403).json({ error: 'Administrator privileges required' });
};

/**
 * The top tier only. Guards the account-recovery powers that let one operator
 * set any user's password — deliberately narrower than requireAdmin so an
 * ordinary admin cannot seize accounts.
 */
export const requireSuperAdmin: RequestHandler = (req: AuthedRequest, res, next) => {
  if (isSuperAdminRole(req.user?.role)) {
    next();
    return;
  }
  res.status(403).json({ error: 'Super administrator privileges required' });
};

/**
 * Tenant isolation. Throws rather than writing to `res`, so a caller cannot
 * forget to `return` after a denial and keep executing the handler — which is
 * how `POST /api/programs/:id/issue` and `POST /api/certificates/:id/status`
 * ended up with no isolation at all.
 */
export async function assertWorkspaceAccess(
  req: AuthedRequest,
  workspaceId: string | null | undefined,
): Promise<void> {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Authentication required');
  if (isAdminRole(user.role)) return;
  if (!workspaceId) throw new HttpError(403, 'Workspace access denied');
  if (user.workspaceId === workspaceId) return;

  const result = await pool.query<{ created_by_email: string }>(
    'SELECT created_by_email FROM workspaces WHERE id = $1',
    [workspaceId],
  );
  if (result.rows[0]?.created_by_email === user.email) return;

  throw new HttpError(403, 'Workspace access denied');
}

/** Every workspace id this user may read. Admins get everything. */
export async function accessibleWorkspaceIds(req: AuthedRequest): Promise<string[] | 'all'> {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Authentication required');
  if (isAdminRole(user.role)) return 'all';

  const result = await pool.query<{ id: string }>(
    'SELECT id FROM workspaces WHERE id = $1 OR created_by_email = $2',
    [user.workspaceId, user.email],
  );
  return result.rows.map((r) => r.id);
}

/**
 * Guards the internal email-drain endpoint, which is invoked by the platform
 * scheduler rather than a logged-in human.
 */
export const requireCronSecret: RequestHandler = (req, res, next) => {
  const configured = env.CRON_SECRET;
  if (!configured) {
    res.status(503).json({ error: 'Scheduler endpoint not configured' });
    return;
  }

  const header = req.headers.authorization ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!provided || !safeCompare(provided, configured)) {
    logger.warn('Rejected scheduler request', { ipHash: clientIpHash(req) });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
