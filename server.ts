/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Glint API server.
 *
 * `lib/env.js` is imported first and on purpose: it loads .env files and
 * validates every secret before any other module reads process.env.
 */

import './lib/env.js';

import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import type { PoolClient } from 'pg';

import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { pool, withTransaction, UNIQUE_VIOLATION } from './lib/db.js';
import {
  type AuthedRequest,
  HttpError,
  accessibleWorkspaceIds,
  aiLimiter,
  assertWorkspaceAccess,
  asyncHandler,
  authLimiter,
  authenticate,
  clientIpHash,
  corsMiddleware,
  errorHandler,
  globalLimiter,
  issuanceLimiter,
  issueToken,
  publicReadLimiter,
  registerLimiter,
  requireAdmin,
  requireCronSecret,
  securityHeaders,
  statsLimiter,
  verifyLimiter,
} from './lib/http.js';
import {
  certificateStatusSchema,
  createProgramSchema,
  createWorkspaceSchema,
  generateTemplateSchema,
  issueSchema,
  loginSchema,
  parseBody,
  parseSampleSchema,
  registerSchema,
  statsSchema,
  templateBodySchema,
  updateProgramSchema,
  updateWorkspaceSchema,
} from './lib/schemas.js';
import {
  evaluateCertificate,
  maskEmail,
  newCertificateId,
  newId,
  signCertificate,
  SIGNATURE_ALG,
  SIGNATURE_VERSION,
} from './lib/security.js';
import { drainOutbox, enqueueEmail, renderIssuanceEmailText } from './lib/mailer.js';
import bcrypt from 'bcryptjs';

const app = express();

// -----------------------------------------------------------------------------
// Global middleware
// -----------------------------------------------------------------------------

/**
 * Rate limiting keys on `req.ip`. Express derives that from X-Forwarded-For only
 * as far as it trusts the proxy chain. `trust proxy: true` would let any client
 * forge the header and sidestep every limit; Vercel puts exactly one proxy in
 * front of the function, and locally there is none.
 */
app.set('trust proxy', env.isServerless ? 1 : 'loopback');
app.disable('x-powered-by');

app.use(securityHeaders());
app.use(corsMiddleware());
// Template backgrounds and AI sample images arrive as base64 data URIs. 50mb was
// enough to let one request pin a large chunk of the function's memory.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ limit: '12mb', extended: true }));
app.use('/api', globalLimiter);

// -----------------------------------------------------------------------------
// Row serialisers
// -----------------------------------------------------------------------------

const iso = (value: Date | null | undefined): string | undefined => value?.toISOString();

function mapWorkspace(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdTime: iso(row.created_time),
    plan: row.plan,
    branding: {
      brandName: row.brand_name,
      logoUrl: row.logo_url ?? undefined,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      customDomain: row.custom_domain ?? undefined,
      senderName: row.sender_name,
      senderEmail: row.sender_email,
      whiteLabel: row.white_label,
      footerText: row.footer_text ?? undefined,
    },
  };
}

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

const CUSTOM_FONT_MARKER = '__customFont';
// Extra per-template flags that have no dedicated column are stashed as a marker
// element inside the text_elements JSON, so they persist without a schema change.
const SETTINGS_MARKER = '__settings';
const TEMPLATE_SETTING_KEYS = [
  'showWatermarkTags',
  'signatoryFontFamily',
  'signatoryFontSize',
  'secondarySignatoryFontFamily',
  'secondarySignatoryFontSize',
  'logoRotation',
  'logoFlipH',
  'logoFlipV',
  'signatureRotation',
  'signatureFlipH',
  'signatureFlipV',
  'secondarySignatureRotation',
  'secondarySignatureFlipH',
  'secondarySignatureFlipV',
] as const;

function splitTemplateTextElements(value: unknown) {
  const textElements = Array.isArray(value) ? value : [];
  const customFonts: any[] = [];
  const renderableTextElements: any[] = [];
  let settings: Record<string, any> = {};

  for (const item of textElements) {
    if (item?.type === CUSTOM_FONT_MARKER && item.customFont) customFonts.push(item.customFont);
    else if (item?.type === SETTINGS_MARKER && item.settings) settings = item.settings;
    else renderableTextElements.push(item);
  }

  return { textElements: renderableTextElements, customFonts, settings };
}

function mapTemplate(row: any) {
  const { textElements, customFonts, settings } = splitTemplateTextElements(row.text_elements);
  return {
    ...Object.fromEntries(
      TEMPLATE_SETTING_KEYS
        .filter((key) => settings[key] !== undefined)
        .map((key) => [key, settings[key]]),
    ),
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    layout: row.layout,
    backgroundColor: row.background_color,
    backgroundGradient: row.background_gradient ?? undefined,
    backgroundImageUrl: row.background_image_url ?? undefined,
    borderColor: row.border_color,
    borderWidth: row.border_width,
    borderRadius: row.border_radius ?? undefined,
    borderStyle: row.border_style ?? undefined,
    decorFlourish: row.decor_flourish ?? undefined,
    showSeal: row.show_seal,
    sealType: row.seal_type,
    sealWidth: num(row.seal_width) ?? 40,
    showQrCode: row.show_qr_code,
    qrCodeX: num(row.qr_code_x),
    qrCodeY: num(row.qr_code_y),
    qrCodeWidth: num(row.qr_code_width) ?? 32,
    qrCodeCustomUrl: row.qr_code_custom_url ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    logoIconType: row.logo_icon_type ?? undefined,
    logoX: num(row.logo_x),
    logoY: num(row.logo_y),
    logoWidth: num(row.logo_width),
    signatureUrl: row.signature_url ?? undefined,
    signatureStyle: row.signature_style ?? undefined,
    signatureX: num(row.signature_x),
    signatureY: num(row.signature_y),
    signatureWidth: num(row.signature_width),
    signatoryName: row.signatory_name ?? undefined,
    signatoryTitle: row.signatory_title ?? undefined,
    showSecondarySignatory: row.show_secondary_signatory ?? undefined,
    secondarySignatureUrl: row.secondary_signature_url ?? undefined,
    secondarySignatoryName: row.secondary_signatory_name ?? undefined,
    secondarySignatoryTitle: row.secondary_signatory_title ?? undefined,
    secondarySignatureX: num(row.secondary_signature_x),
    secondarySignatureY: num(row.secondary_signature_y),
    secondarySignatureWidth: num(row.secondary_signature_width),
    textElements,
    customFonts,
  };
}

function mapProgram(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? '',
    templateId: row.template_id,
    issueDate: row.issue_date ?? '',
    expiryDate: row.expiry_date ?? undefined,
    status: row.status,
    createdTime: iso(row.created_time),
    recipientFields: Array.isArray(row.recipient_fields) ? row.recipient_fields : [],
  };
}

/** The full record. Only ever returned to an authenticated member of the workspace. */
function mapCertificate(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    programId: row.program_id,
    programName: row.program_name,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    customFields: row.custom_fields ?? {},
    issueDate: row.issue_date ?? '',
    expiryDate: row.expiry_date ?? undefined,
    status: row.status,
    revocationReason: row.revocation_reason ?? undefined,
    signature: row.signature,
    signatureAlg: row.signature_alg,
    signatureVersion: row.signature_version,
    viewCount: row.view_count,
    downloadCount: row.download_count,
    shareCount: row.share_count,
    verifyCount: row.verify_count,
    lastViewed: iso(row.last_viewed),
  };
}

/**
 * What an anonymous visitor may see.
 *
 * The old public endpoints returned `recipient_email` verbatim, plus an audit
 * trail whose `details` strings embedded the recipient's address. A certificate
 * link is designed to be posted on LinkedIn — it was leaking the holder's email
 * to anyone who opened it, and the identifiers were sequential, so the whole
 * registry could be walked.
 */
function mapPublicCertificate(row: any) {
  return {
    id: row.id,
    programName: row.program_name,
    recipientName: row.recipient_name,
    recipientEmailMasked: maskEmail(row.recipient_email),
    customFields: row.custom_fields ?? {},
    issueDate: row.issue_date ?? '',
    expiryDate: row.expiry_date ?? undefined,
    status: row.status,
    revocationReason: row.revocation_reason ?? undefined,
    signature: row.signature,
    signatureAlg: row.signature_alg,
    signatureVersion: row.signature_version,
    viewCount: row.view_count,
    downloadCount: row.download_count,
    shareCount: row.share_count,
    verifyCount: row.verify_count,
  };
}

function toSignable(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    programId: row.program_id ?? null,
    programName: row.program_name,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date ?? null,
  };
}

// -----------------------------------------------------------------------------
// Event log
// -----------------------------------------------------------------------------

type CertEvent =
  | 'CREATED' | 'ISSUED' | 'EMAIL_QUEUED' | 'EMAIL_DISPATCHED' | 'EMAIL_FAILED'
  | 'VERIFIED' | 'REVOKED' | 'RESTORED' | 'VIEWED' | 'DOWNLOADED' | 'SHARED'
  | 'METADATA_UPDATED';

async function recordEvent(
  db: PoolClient | typeof pool,
  certificateId: string,
  event: CertEvent,
  opts: { performedBy?: string; details?: string; ipHash?: string | null; isPublic?: boolean } = {},
): Promise<void> {
  await db.query(
    `INSERT INTO certificate_events (certificate_id, event, performed_by, details, actor_ip_hash, is_public)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      certificateId,
      event,
      opts.performedBy ?? 'system',
      opts.details ?? null,
      opts.ipHash ?? null,
      opts.isPublic ?? true,
    ],
  );
}

async function loadEvents(certificateId: string, publicOnly: boolean) {
  const result = await pool.query(
    `SELECT event, performed_by, details, created_at
     FROM certificate_events
     WHERE certificate_id = $1 ${publicOnly ? 'AND is_public = true' : ''}
     ORDER BY created_at ASC
     LIMIT 200`,
    [certificateId],
  );
  return result.rows.map((r) => ({
    timestamp: r.created_at.toISOString(),
    event: r.event,
    performedBy: r.performed_by,
    details: r.details ?? '',
  }));
}

async function logAuthEvent(
  email: string,
  event: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOCKED_OUT' | 'REGISTERED' | 'TOKEN_REJECTED',
  req: AuthedRequest,
  userId?: string,
): Promise<void> {
  await pool
    .query(
      `INSERT INTO auth_events (email, user_id, event, actor_ip_hash, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, userId ?? null, event, clientIpHash(req), (req.headers['user-agent'] ?? '').slice(0, 300)],
    )
    .catch((err) => logger.error('Failed to write auth event', err));
}

// =============================================================================
// Auth
// =============================================================================

app.post(
  '/api/auth/login',
  authLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { email, password } = parseBody(loginSchema, req.body);

    const result = await pool.query(
      `SELECT id, email, name, role, workspace_id, password_hash, token_version,
              failed_login_attempts, locked_until
       FROM users WHERE email = $1`,
      [email],
    );
    const user = result.rows[0];

    // Uniform failure. Distinguishing "no such user" from "wrong password" turns
    // the login form into an account-enumeration oracle.
    const invalid = () => {
      throw new HttpError(401, 'Invalid email or password');
    };

    if (!user) {
      await logAuthEvent(email, 'LOGIN_FAILED', req);
      // Spend roughly the same time as a real bcrypt comparison so response
      // latency does not reveal whether the account exists.
      await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
      invalid();
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAuthEvent(email, 'LOCKED_OUT', req, user.id);
      throw new HttpError(423, 'Account temporarily locked. Try again shortly.');
    }

    if (!(await bcrypt.compare(password, user.password_hash))) {
      const attempts = user.failed_login_attempts + 1;
      const lock = attempts >= env.MAX_FAILED_LOGINS;
      await pool.query(
        `UPDATE users
           SET failed_login_attempts = $2,
               locked_until = CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE locked_until END
         WHERE id = $1`,
        [user.id, lock ? 0 : attempts, lock, env.LOCKOUT_MINUTES],
      );
      await logAuthEvent(email, lock ? 'LOCKED_OUT' : 'LOGIN_FAILED', req, user.id);
      invalid();
    }

    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`,
      [user.id],
    );
    await logAuthEvent(email, 'LOGIN_SUCCESS', req, user.id);

    res.json({
      token: issueToken(user.id, user.token_version),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspace_id,
      },
    });
  }),
);

app.post(
  '/api/auth/register',
  registerLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { email, password, name, workspaceName } = parseBody(registerSchema, req.body);

    const created = await withTransaction(async (client) => {
      const existing = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        throw new HttpError(409, 'An account with this email already exists');
      }

      const workspaceId = newId('ws');
      const baseSlug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      // `slug` is UNIQUE; two workspaces called "Acme" must not collide.
      const slug = `${baseSlug || 'workspace'}-${workspaceId.slice(-6).toLowerCase()}`;

      await client.query(
        `INSERT INTO workspaces
           (id, name, slug, plan, brand_name, primary_color, accent_color,
            sender_name, sender_email, white_label, footer_text, created_by_email)
         VALUES ($1, $2, $3, 'free', $4, '#0F172A', '#F59E0B', $5, $6, false, $7, $8)`,
        [
          workspaceId,
          workspaceName,
          slug,
          workspaceName,
          `${workspaceName} Credentials`,
          // The verified sender identity, not a hardcoded domain nobody owns.
          // The verified sender identity from MAIL_FROM, not a hardcoded domain.
          env.mailFrom ?? null,
          `Issued by ${workspaceName}`,
          email,
        ],
      );

      const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
      const userId = newId('u');
      await client.query(
        `INSERT INTO users (id, email, password_hash, name, role, workspace_id)
         VALUES ($1, $2, $3, $4, 'issuer', $5)`,
        [userId, email, passwordHash, name, workspaceId],
      );

      return { userId, workspaceId };
    }).catch((err) => {
      if (err instanceof HttpError) throw err;
      if ((err as any)?.code === UNIQUE_VIOLATION) {
        throw new HttpError(409, 'An account with this email already exists');
      }
      throw err;
    });

    await logAuthEvent(email, 'REGISTERED', req, created.userId);

    res.status(201).json({
      token: issueToken(created.userId, 0),
      user: {
        id: created.userId,
        email,
        name,
        role: 'issuer',
        workspaceId: created.workspaceId,
      },
    });
  }),
);

app.get(
  '/api/auth/me',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(req.user);
  }),
);

/**
 * Liveness probe. It used to echo a masked DATABASE_URL and the raw driver error
 * text to anyone who asked — the host, database name, and username of the
 * production database, unauthenticated.
 */
app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded' });
    }
  }),
);

// =============================================================================
// Admin
// =============================================================================

app.get(
  '/api/admin/workspaces',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const result = await pool.query(`
      SELECT w.*,
        (SELECT COUNT(*)::int FROM programs p WHERE p.workspace_id = w.id) AS program_count,
        (SELECT COUNT(*)::int FROM certificates c WHERE c.workspace_id = w.id) AS certificate_count
      FROM workspaces w
      ORDER BY w.created_time DESC
    `);
    res.json(result.rows);
  }),
);

app.put(
  '/api/admin/workspaces/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = parseBody(updateWorkspaceSchema, req.body);
    const result = await pool.query(
      `UPDATE workspaces
         SET name = COALESCE($2, name),
             brand_name = COALESCE($3, brand_name),
             plan = COALESCE($4, plan)
       WHERE id = $1
       RETURNING *`,
      [req.params.id, body.name ?? null, body.branding?.brandName ?? null, body.plan ?? null],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Workspace not found');
    res.json(mapWorkspace(result.rows[0]));
  }),
);

app.delete(
  '/api/admin/workspaces/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Every child table declares ON DELETE CASCADE, so the manual per-table
    // delete sequence — which silently skipped certificate_events and left
    // orphans — is unnecessary.
    const result = await pool.query('DELETE FROM workspaces WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) throw new HttpError(404, 'Workspace not found');
    logger.warn('Workspace deleted by admin', { workspaceId: req.params.id });
    res.json({ success: true });
  }),
);

app.get(
  '/api/admin/programs',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const result = await pool.query(`
      SELECT p.*, w.name AS workspace_name,
        (SELECT COUNT(*)::int FROM certificates c WHERE c.program_id = p.id) AS certificate_count
      FROM programs p
      JOIN workspaces w ON p.workspace_id = w.id
      ORDER BY p.created_time DESC
    `);
    res.json(result.rows);
  }),
);

app.put(
  '/api/admin/programs/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = parseBody(updateProgramSchema, req.body);
    const result = await pool.query(
      `UPDATE programs SET name = COALESCE($2, name), description = COALESCE($3, description)
       WHERE id = $1 RETURNING *`,
      [req.params.id, body.name ?? null, body.description ?? null],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Program not found');
    res.json(mapProgram(result.rows[0]));
  }),
);

app.delete(
  '/api/admin/programs/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await pool.query('DELETE FROM programs WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) throw new HttpError(404, 'Program not found');
    res.json({ success: true });
  }),
);

/**
 * Raw rows, like the other /api/admin/* endpoints — the operations views read
 * snake_case. `audit_trail` and `security_hash` no longer exist; the history
 * lives in certificate_events and the signature is `signature`.
 */
app.get(
  '/api/admin/certificates',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const result = await pool.query(`
      SELECT c.*, w.name AS workspace_name
      FROM certificates c
      LEFT JOIN workspaces w ON c.workspace_id = w.id
      ORDER BY c.created_time DESC
      LIMIT 5000
    `);
    res.json(result.rows);
  }),
);

// =============================================================================
// Workspaces
// =============================================================================

app.get(
  '/api/workspaces',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const scope = await accessibleWorkspaceIds(req);
    const result =
      scope === 'all'
        ? await pool.query('SELECT * FROM workspaces ORDER BY created_time DESC')
        : await pool.query('SELECT * FROM workspaces WHERE id = ANY($1) ORDER BY created_time DESC', [scope]);
    res.json(result.rows.map(mapWorkspace));
  }),
);

app.get(
  '/api/workspaces/:id',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    await assertWorkspaceAccess(req, req.params.id);
    const result = await pool.query('SELECT * FROM workspaces WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) throw new HttpError(404, 'Workspace not found');
    res.json(mapWorkspace(result.rows[0]));
  }),
);

app.post(
  '/api/workspaces',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = parseBody(createWorkspaceSchema, req.body);
    const id = newId('ws');
    const baseSlug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const brandName = body.brandName || body.name;

    const result = await pool.query(
      `INSERT INTO workspaces
         (id, name, slug, plan, brand_name, primary_color, accent_color,
          sender_name, sender_email, white_label, footer_text, created_by_email)
       VALUES ($1, $2, $3, 'free', $4, $5, $6, $7, $8, false, $9, $10)
       RETURNING *`,
      [
        id,
        body.name,
        `${baseSlug || 'workspace'}-${id.slice(-6).toLowerCase()}`,
        brandName,
        body.primaryColor ?? '#0F172A',
        body.accentColor ?? '#F59E0B',
        `${brandName} Credentials`,
        env.mailFrom ?? null,
        `Issued by ${brandName}`,
        req.user!.email,
      ],
    );
    res.status(201).json(mapWorkspace(result.rows[0]));
  }),
);

app.put(
  '/api/workspaces/:id',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    await assertWorkspaceAccess(req, req.params.id);
    const body = parseBody(updateWorkspaceSchema, req.body);
    const b = body.branding ?? {};

    // `plan` is a billing attribute. A tenant must not be able to upgrade
    // themselves to 'enterprise' by PUTting their own workspace.
    const plan = req.user!.role === 'admin' ? body.plan ?? null : null;

    const result = await pool.query(
      `UPDATE workspaces SET
         name = COALESCE($2, name),
         plan = COALESCE($3, plan),
         brand_name = COALESCE($4, brand_name),
         logo_url = COALESCE($5, logo_url),
         primary_color = COALESCE($6, primary_color),
         accent_color = COALESCE($7, accent_color),
         custom_domain = COALESCE($8, custom_domain),
         sender_name = COALESCE($9, sender_name),
         sender_email = COALESCE($10, sender_email),
         white_label = COALESCE($11, white_label),
         footer_text = COALESCE($12, footer_text)
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        body.name ?? null,
        plan,
        b.brandName ?? null,
        b.logoUrl || null,
        b.primaryColor ?? null,
        b.accentColor ?? null,
        b.customDomain || null,
        b.senderName || null,
        b.senderEmail ?? null,
        b.whiteLabel ?? null,
        b.footerText || null,
      ],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Workspace not found');
    res.json(mapWorkspace(result.rows[0]));
  }),
);

// =============================================================================
// Programs
// =============================================================================

/** Placeholders the renderer already resolves; a CSV column may not shadow them. */
const RESERVED_FIELDS = new Set(['name', 'email', 'date', 'id', 'program']);

function sanitizeRecipientFields(fields: string[] | undefined): string[] {
  if (!Array.isArray(fields)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of fields) {
    const field = String(raw).trim();
    const lower = field.toLowerCase();
    if (!field || RESERVED_FIELDS.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    out.push(field);
  }
  return out;
}

app.get(
  '/api/programs',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const wsId = req.query.workspaceId as string | undefined;
    if (wsId) {
      await assertWorkspaceAccess(req, wsId);
      const result = await pool.query('SELECT * FROM programs WHERE workspace_id = $1 ORDER BY created_time DESC', [wsId]);
      res.json(result.rows.map(mapProgram));
      return;
    }
    const scope = await accessibleWorkspaceIds(req);
    const result =
      scope === 'all'
        ? await pool.query('SELECT * FROM programs ORDER BY created_time DESC')
        : await pool.query('SELECT * FROM programs WHERE workspace_id = ANY($1) ORDER BY created_time DESC', [scope]);
    res.json(result.rows.map(mapProgram));
  }),
);

app.post(
  '/api/programs',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = parseBody(createProgramSchema, req.body);
    await assertWorkspaceAccess(req, body.workspaceId);

    // A program may only point at a template belonging to the same workspace.
    if (body.templateId) {
      const t = await pool.query('SELECT workspace_id FROM templates WHERE id = $1', [body.templateId]);
      if (t.rows.length === 0) throw new HttpError(400, 'Template not found');
      if (t.rows[0].workspace_id !== body.workspaceId) {
        throw new HttpError(403, 'Template belongs to another workspace');
      }
    }

    const id = newId('prg');
    const result = await pool.query(
      `INSERT INTO programs
         (id, workspace_id, name, description, template_id, issue_date, expiry_date, status, recipient_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        body.workspaceId,
        body.name,
        body.description || null,
        body.templateId ?? null,
        body.issueDate ?? new Date().toISOString().slice(0, 10),
        body.expiryDate || null,
        body.status ?? 'draft',
        JSON.stringify(sanitizeRecipientFields(body.recipientFields)),
      ],
    );
    res.status(201).json(mapProgram(result.rows[0]));
  }),
);

app.put(
  '/api/programs/:id',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'Program not found');
    await assertWorkspaceAccess(req, existing.rows[0].workspace_id);

    const body = parseBody(updateProgramSchema, req.body);

    if (body.templateId) {
      const t = await pool.query('SELECT workspace_id FROM templates WHERE id = $1', [body.templateId]);
      if (t.rows.length === 0) throw new HttpError(400, 'Template not found');
      if (t.rows[0].workspace_id !== existing.rows[0].workspace_id) {
        throw new HttpError(403, 'Template belongs to another workspace');
      }
    }

    const fields = body.recipientFields
      ? sanitizeRecipientFields(body.recipientFields)
      : existing.rows[0].recipient_fields;

    const result = await pool.query(
      `UPDATE programs SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         template_id = COALESCE($4, template_id),
         issue_date = COALESCE($5, issue_date),
         expiry_date = $6,
         status = COALESCE($7, status),
         recipient_fields = $8
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        body.name ?? null,
        body.description ?? null,
        body.templateId ?? null,
        body.issueDate ?? null,
        body.expiryDate === undefined ? existing.rows[0].expiry_date : body.expiryDate || null,
        body.status ?? null,
        JSON.stringify(fields),
      ],
    );
    res.json(mapProgram(result.rows[0]));
  }),
);

app.delete(
  '/api/programs/:id',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await pool.query('SELECT workspace_id FROM programs WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'Program not found');
    await assertWorkspaceAccess(req, existing.rows[0].workspace_id);
    await pool.query('DELETE FROM programs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Program deleted' });
  }),
);

// =============================================================================
// Templates
// =============================================================================

app.get(
  '/api/templates',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const wsId = req.query.workspaceId as string | undefined;
    if (wsId) {
      await assertWorkspaceAccess(req, wsId);
      const result = await pool.query('SELECT * FROM templates WHERE workspace_id = $1 ORDER BY created_time DESC', [wsId]);
      res.json(result.rows.map(mapTemplate));
      return;
    }
    const scope = await accessibleWorkspaceIds(req);
    const result =
      scope === 'all'
        ? await pool.query('SELECT * FROM templates ORDER BY created_time DESC')
        : await pool.query('SELECT * FROM templates WHERE workspace_id = ANY($1) ORDER BY created_time DESC', [scope]);
    res.json(result.rows.map(mapTemplate));
  }),
);

const TEMPLATE_COLUMNS = [
  'workspace_id', 'name', 'layout', 'background_color', 'background_gradient', 'background_image_url',
  'border_color', 'border_width', 'border_radius', 'border_style', 'decor_flourish',
  'show_seal', 'seal_type', 'seal_width', 'show_qr_code', 'qr_code_x', 'qr_code_y', 'qr_code_width',
  'qr_code_custom_url', 'logo_url', 'logo_icon_type', 'logo_x', 'logo_y', 'logo_width',
  'signature_url', 'signature_style', 'signature_x', 'signature_y', 'signature_width',
  'signatory_name', 'signatory_title', 'show_secondary_signatory', 'secondary_signature_url',
  'secondary_signatory_name', 'secondary_signatory_title', 'secondary_signature_x',
  'secondary_signature_y', 'secondary_signature_width', 'text_elements',
] as const;

function templateValues(body: any, workspaceId: string): unknown[] {
  const nz = (v: unknown, fallback: unknown) => (v === undefined || v === '' ? fallback : v);
  const settings = Object.fromEntries(
    TEMPLATE_SETTING_KEYS
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key]]),
  );
  const packedTextElements = [
    ...(body.textElements ?? []),
    ...(body.customFonts ?? []).map((font: any) => ({
      id: `font-meta-${font.id}`,
      type: CUSTOM_FONT_MARKER,
      customFont: font,
    })),
    ...(Object.keys(settings).length ? [{ id: 'settings-meta', type: SETTINGS_MARKER, settings }] : []),
  ];
  return [
    workspaceId,
    body.name,
    nz(body.layout, 'landscape'),
    nz(body.backgroundColor, '#ffffff'),
    body.backgroundGradient || null,
    body.backgroundImageUrl || null,
    nz(body.borderColor, '#000000'),
    nz(body.borderWidth, 2),
    nz(body.borderRadius, 0),
    nz(body.borderStyle, 'solid'),
    nz(body.decorFlourish, 'none'),
    nz(body.showSeal, true),
    nz(body.sealType, 'classic'),
    nz(body.sealWidth, 40),
    nz(body.showQrCode, true),
    nz(body.qrCodeX, 10),
    nz(body.qrCodeY, 85),
    nz(body.qrCodeWidth, 32),
    body.qrCodeCustomUrl || null,
    body.logoUrl || null,
    body.logoIconType || null,
    nz(body.logoX, 50),
    nz(body.logoY, 10),
    nz(body.logoWidth, 100),
    body.signatureUrl || null,
    body.signatureStyle || null,
    nz(body.signatureX, 50),
    nz(body.signatureY, 75),
    nz(body.signatureWidth, 90),
    body.signatoryName || null,
    body.signatoryTitle || null,
    nz(body.showSecondarySignatory, false),
    body.secondarySignatureUrl || null,
    body.secondarySignatoryName || null,
    body.secondarySignatoryTitle || null,
    body.secondarySignatureX ?? null,
    body.secondarySignatureY ?? null,
    body.secondarySignatureWidth ?? null,
    JSON.stringify(packedTextElements),
  ];
}

app.post(
  '/api/templates',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = parseBody(templateBodySchema, req.body);
    await assertWorkspaceAccess(req, body.workspaceId);

    const id = newId('tpl');
    const values = templateValues(body, body.workspaceId);
    const placeholders = values.map((_, i) => `$${i + 2}`).join(', ');

    const result = await pool.query(
      `INSERT INTO templates (id, ${TEMPLATE_COLUMNS.join(', ')})
       VALUES ($1, ${placeholders})
       RETURNING *`,
      [id, ...values],
    );
    res.status(201).json(mapTemplate(result.rows[0]));
  }),
);

app.put(
  '/api/templates/:id',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await pool.query('SELECT workspace_id FROM templates WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'Template not found');
    const workspaceId = existing.rows[0].workspace_id;
    await assertWorkspaceAccess(req, workspaceId);

    // The workspace of an existing template is immutable; a body claiming a
    // different one must not move it into a workspace the caller can also reach.
    const body = parseBody(templateBodySchema, { ...req.body, workspaceId });

    const values = templateValues(body, workspaceId);
    const assignments = TEMPLATE_COLUMNS.map((col, i) => `${col} = $${i + 2}`).join(', ');

    const result = await pool.query(
      `UPDATE templates SET ${assignments} WHERE id = $1 RETURNING *`,
      [req.params.id, ...values],
    );
    res.json(mapTemplate(result.rows[0]));
  }),
);

app.delete(
  '/api/templates/:id',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await pool.query('SELECT workspace_id FROM templates WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'Template not found');
    await assertWorkspaceAccess(req, existing.rows[0].workspace_id);
    await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deleted' });
  }),
);

// =============================================================================
// Issuance
// =============================================================================

/**
 * Bulk issuance.
 *
 * Certificates and their outbox rows are written in one transaction, then the
 * response returns. Mail is delivered out of band. See lib/mailer.ts.
 *
 * The tenant check was entirely absent here: any authenticated user could POST
 * to any program id in any workspace and mint certificates under someone else's
 * brand.
 */
app.post(
  '/api/programs/:id/issue',
  authenticate,
  issuanceLimiter,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { recipients } = parseBody(issueSchema, req.body);

    const programResult = await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (programResult.rows.length === 0) throw new HttpError(404, 'Program not found');
    const program = programResult.rows[0];

    await assertWorkspaceAccess(req, program.workspace_id);

    // A CSV pasted twice, or with a repeated row, would otherwise trip the
    // partial unique index halfway through and abort the whole batch.
    const seen = new Set<string>();
    const unique = recipients.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });
    const duplicatesDropped = recipients.length - unique.length;

    const workspaceResult = await pool.query('SELECT brand_name FROM workspaces WHERE id = $1', [program.workspace_id]);
    const brandName = workspaceResult.rows[0]?.brand_name ?? 'Glint';
    const issueDate = program.issue_date ?? new Date().toISOString().slice(0, 10);
    const expiryDate = program.expiry_date ?? null;

    const issued = await withTransaction(async (client) => {
      await client.query("UPDATE programs SET status = 'active' WHERE id = $1", [program.id]);

      const created: any[] = [];
      for (const recipient of unique) {
        const certId = newCertificateId();
        const signable = {
          id: certId,
          workspaceId: program.workspace_id,
          programId: program.id,
          programName: program.name,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          issueDate,
          expiryDate,
        };
        const signature = signCertificate(signable);

        const inserted = await client.query(
          `INSERT INTO certificates
             (id, workspace_id, program_id, program_name, recipient_name, recipient_email,
              custom_fields, issue_date, expiry_date, status, signature, signature_alg, signature_version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'valid', $10, $11, $12)
           ON CONFLICT (program_id, recipient_email) WHERE status <> 'revoked' DO NOTHING
           RETURNING *`,
          [
            certId,
            program.workspace_id,
            program.id,
            program.name,
            recipient.name,
            recipient.email,
            JSON.stringify(recipient.customFields ?? {}),
            issueDate,
            expiryDate,
            signature,
            SIGNATURE_ALG,
            SIGNATURE_VERSION,
          ],
        );

        // Already held a valid certificate for this program — skip silently
        // rather than failing the batch.
        if (inserted.rows.length === 0) continue;
        const cert = inserted.rows[0];

        await recordEvent(client, certId, 'ISSUED', {
          performedBy: req.user!.email,
          details: `Issued via bulk import (${Object.keys(recipient.customFields ?? {}).length} custom fields)`,
        });

        const verificationUrl = `${env.appUrl}/c/${certId}`;
        await enqueueEmail(client, {
          workspaceId: program.workspace_id,
          programId: program.id,
          programName: program.name,
          certificateId: certId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: `Your credential for ${program.name} is ready`,
          body: renderIssuanceEmailText({
            recipientName: recipient.name,
            programName: program.name,
            certificateId: certId,
            verificationUrl,
            brandName,
          }),
          verificationUrl,
        });
        await recordEvent(client, certId, 'EMAIL_QUEUED', { details: `Queued for ${recipient.email}`, isPublic: false });

        created.push(cert);
      }
      return created;
    });

    res.status(201).json({
      message: `Issued ${issued.length} credential${issued.length === 1 ? '' : 's'}.`,
      issuedCount: issued.length,
      skippedCount: unique.length - issued.length,
      duplicatesDropped,
      queuedEmails: issued.length,
      certificates: issued.map(mapCertificate),
    });

    // Locally there is no platform scheduler, so drain right after responding.
    // The client already has its answer; a slow SMTP server no longer holds the
    // request open.
    if (!env.isServerless && issued.length > 0) {
      void drainOutbox(Math.min(issued.length, 50)).catch((err) => logger.error('Background drain failed', err));
    }
  }),
);

// =============================================================================
// Certificates — authenticated
// =============================================================================

app.get(
  '/api/certificates',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const wsId = req.query.workspaceId as string | undefined;
    const programId = req.query.programId as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (wsId) {
      await assertWorkspaceAccess(req, wsId);
      params.push(wsId);
      conditions.push(`workspace_id = $${params.length}`);
    } else {
      const scope = await accessibleWorkspaceIds(req);
      if (scope !== 'all') {
        params.push(scope);
        conditions.push(`workspace_id = ANY($${params.length})`);
      }
    }

    if (programId) {
      params.push(programId);
      conditions.push(`program_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM certificates ${where} ORDER BY created_time DESC LIMIT 5000`,
      params,
    );
    res.json(result.rows.map(mapCertificate));
  }),
);

/** Revocation. Previously authenticated but with no tenant check whatsoever. */
app.post(
  '/api/certificates/:id/status',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { status, reason } = parseBody(certificateStatusSchema, req.body);

    const existing = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'Certificate not found');
    await assertWorkspaceAccess(req, existing.rows[0].workspace_id);

    const revoking = status === 'revoked';
    const revocationReason = revoking ? reason || 'Revoked by workspace administrator' : null;

    const result = await pool.query(
      `UPDATE certificates SET status = $2, revocation_reason = $3 WHERE id = $1 RETURNING *`,
      [req.params.id, status, revocationReason],
    );

    await recordEvent(pool, req.params.id, revoking ? 'REVOKED' : 'RESTORED', {
      performedBy: req.user!.email,
      details: revoking ? `Revoked. Reason: ${revocationReason}` : 'Restored to valid',
    });

    res.json(mapCertificate(result.rows[0]));
  }),
);

/** Full event history, including entries marked non-public. Workspace members only. */
app.get(
  '/api/certificates/:id/events',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await pool.query('SELECT workspace_id FROM certificates WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'Certificate not found');
    await assertWorkspaceAccess(req, existing.rows[0].workspace_id);
    res.json(await loadEvents(req.params.id, false));
  }),
);

app.post(
  '/api/certificates/:id/resend',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'Certificate not found');
    const cert = existing.rows[0];
    await assertWorkspaceAccess(req, cert.workspace_id);

    if (cert.status === 'revoked') {
      throw new HttpError(409, 'Cannot resend a revoked certificate');
    }

    const ws = await pool.query('SELECT brand_name FROM workspaces WHERE id = $1', [cert.workspace_id]);
    const brandName = ws.rows[0]?.brand_name ?? 'Glint';
    const verificationUrl = `${env.appUrl}/c/${cert.id}`;

    await enqueueEmail(pool, {
      workspaceId: cert.workspace_id,
      programId: cert.program_id,
      programName: cert.program_name,
      certificateId: cert.id,
      recipientEmail: cert.recipient_email,
      recipientName: cert.recipient_name,
      subject: `Your credential for ${cert.program_name} (resent)`,
      body: renderIssuanceEmailText({
        recipientName: cert.recipient_name,
        programName: cert.program_name,
        certificateId: cert.id,
        verificationUrl,
        brandName,
      }),
      verificationUrl,
      kind: 'resend',
    });

    await recordEvent(pool, cert.id, 'EMAIL_QUEUED', {
      performedBy: req.user!.email,
      details: 'Resend requested',
      isPublic: false,
    });

    res.json({ success: true, message: 'Email queued for delivery' });

    if (!env.isServerless) {
      void drainOutbox(5).catch((err) => logger.error('Background drain failed', err));
    }
  }),
);

app.get(
  '/api/email-logs',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const wsId = req.query.workspaceId as string | undefined;
    let where = '';
    const params: unknown[] = [];

    if (wsId) {
      await assertWorkspaceAccess(req, wsId);
      params.push(wsId);
      where = 'WHERE workspace_id = $1';
    } else {
      const scope = await accessibleWorkspaceIds(req);
      if (scope !== 'all') {
        params.push(scope);
        where = 'WHERE workspace_id = ANY($1)';
      }
    }

    const result = await pool.query(
      `SELECT * FROM email_messages ${where} ORDER BY created_time DESC LIMIT 1000`,
      params,
    );
    res.json(
      result.rows.map((e) => ({
        id: e.id,
        workspaceId: e.workspace_id,
        recipientEmail: e.recipient_email,
        recipientName: e.recipient_name,
        subject: e.subject,
        body: e.body,
        certificateId: e.certificate_id,
        status: e.status,
        attempts: e.attempts,
        lastError: e.last_error ?? undefined,
        sentTime: iso(e.sent_time) ?? iso(e.created_time),
      })),
    );
  }),
);

// =============================================================================
// Certificates — public
// =============================================================================

/**
 * The public certificate page.
 *
 * The template is returned here. It used to be fetched separately from
 * `GET /api/templates`, which requires a bearer token — so for an anonymous
 * recipient that call returned 401, the failure was swallowed, and the viewer
 * silently fell back to a hardcoded template signed by "Thomas Kurian, CEO".
 * Every shared certificate rendered with the wrong design.
 */
app.get(
  '/api/certificates/:id',
  publicReadLimiter,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT c.*, t.id AS t_id
       FROM certificates c
       LEFT JOIN programs p ON p.id = c.program_id
       LEFT JOIN templates t ON t.id = p.template_id
       WHERE c.id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Certificate not found');
    const cert = result.rows[0];

    const templateResult = cert.t_id
      ? await pool.query('SELECT * FROM templates WHERE id = $1', [cert.t_id])
      : null;

    const brandingResult = await pool.query('SELECT * FROM workspaces WHERE id = $1', [cert.workspace_id]);
    const workspace = brandingResult.rows[0];

    res.json({
      certificate: mapPublicCertificate(cert),
      template: templateResult?.rows[0] ? mapTemplate(templateResult.rows[0]) : null,
      branding: workspace ? mapWorkspace(workspace).branding : null,
      auditTrail: await loadEvents(cert.id, true),
    });
  }),
);

/** Analytics counters. Returns only the counters, never the certificate record. */
app.post(
  '/api/certificates/:id/stats',
  statsLimiter,
  asyncHandler(async (req, res) => {
    const { action } = parseBody(statsSchema, req.body);

    const column = { view: 'view_count', download: 'download_count', share: 'share_count' }[action];
    const result = await pool.query(
      `UPDATE certificates
         SET ${column} = ${column} + 1
             ${action === 'view' ? ', last_viewed = now()' : ''}
       WHERE id = $1
       RETURNING view_count, download_count, share_count, verify_count`,
      [req.params.id],
    );
    if (result.rows.length === 0) throw new HttpError(404, 'Certificate not found');

    if (action !== 'view') {
      await recordEvent(pool, req.params.id, action === 'download' ? 'DOWNLOADED' : 'SHARED', {
        performedBy: 'recipient',
        ipHash: clientIpHash(req),
      });
    }

    res.json({
      viewCount: result.rows[0].view_count,
      downloadCount: result.rows[0].download_count,
      shareCount: result.rows[0].share_count,
      verifyCount: result.rows[0].verify_count,
    });
  }),
);

/**
 * Signature verification.
 *
 * The previous implementation appended an audit row and returned
 * `{ verified: true }` unconditionally — for revoked certificates, for expired
 * ones, and for rows whose contents had been edited directly in the database.
 */
app.post(
  '/api/certificates/:id/verify',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) throw new HttpError(404, 'Certificate not found');
    const cert = result.rows[0];

    const outcome = evaluateCertificate(
      { ...toSignable(cert), status: cert.status, signature: cert.signature },
    );

    if (!outcome.signatureValid) {
      // The stored row does not match its signature. Either the key rotated or
      // somebody wrote to the table directly. Both need a human.
      logger.error('Certificate signature mismatch', undefined, { certificateId: cert.id });
    }

    const ipHash = clientIpHash(req);

    // Only log one verification per source per hour. Otherwise the event table
    // grows without bound every time a page is refreshed.
    const recent = await pool.query(
      `SELECT 1 FROM certificate_events
       WHERE certificate_id = $1 AND event = 'VERIFIED' AND actor_ip_hash IS NOT DISTINCT FROM $2
         AND created_at > now() - interval '1 hour'
       LIMIT 1`,
      [cert.id, ipHash],
    );

    if (recent.rows.length === 0) {
      await recordEvent(pool, cert.id, 'VERIFIED', {
        performedBy: 'public verifier',
        details: `Signature ${outcome.signatureValid ? 'valid' : 'INVALID'}; status ${cert.status}`,
        ipHash,
      });
      await pool.query('UPDATE certificates SET verify_count = verify_count + 1 WHERE id = $1', [cert.id]);
    }

    res.json({
      verified: outcome.verified,
      signatureValid: outcome.signatureValid,
      status: cert.status,
      reasons: outcome.reasons,
      algorithm: cert.signature_alg,
      certificate: mapPublicCertificate(cert),
      verifiedAt: new Date().toISOString(),
    });
  }),
);

// =============================================================================
// Analytics
// =============================================================================

app.get(
  '/api/analytics',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    let wsId = req.query.workspaceId as string | undefined;
    if (wsId) {
      await assertWorkspaceAccess(req, wsId);
    } else {
      wsId = req.user!.workspaceId ?? undefined;
    }
    if (!wsId) throw new HttpError(400, 'workspaceId is required');

    const [totals, programs, issuance, verification, shares] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS issued,
                COALESCE(SUM(view_count), 0)::int AS views,
                COALESCE(SUM(download_count), 0)::int AS downloads,
                COALESCE(SUM(share_count), 0)::int AS shares,
                COALESCE(SUM(verify_count), 0)::int AS verifications
         FROM certificates WHERE workspace_id = $1`,
        [wsId],
      ),
      pool.query(`SELECT COUNT(*)::int AS active FROM programs WHERE workspace_id = $1 AND status = 'active'`, [wsId]),
      // Real daily series over the last 14 days, zero-filled so the chart does
      // not silently close gaps between sparse days.
      pool.query(
        `SELECT d::date AS date, COUNT(c.id)::int AS count
         FROM generate_series(now() - interval '13 days', now(), interval '1 day') d
         LEFT JOIN certificates c
           ON c.workspace_id = $1 AND c.created_time::date = d::date
         GROUP BY d ORDER BY d`,
        [wsId],
      ),
      pool.query(
        `SELECT d::date AS date, COUNT(e.id)::int AS count
         FROM generate_series(now() - interval '13 days', now(), interval '1 day') d
         LEFT JOIN certificate_events e
           ON e.event = 'VERIFIED' AND e.created_at::date = d::date
          AND e.certificate_id IN (SELECT id FROM certificates WHERE workspace_id = $1)
         GROUP BY d ORDER BY d`,
        [wsId],
      ),
      pool.query(
        `SELECT d::date AS date, COUNT(e.id)::int AS count
         FROM generate_series(now() - interval '13 days', now(), interval '1 day') d
         LEFT JOIN certificate_events e
           ON e.event = 'SHARED' AND e.created_at::date = d::date
          AND e.certificate_id IN (SELECT id FROM certificates WHERE workspace_id = $1)
         GROUP BY d ORDER BY d`,
        [wsId],
      ),
    ]);

    const series = (rows: any[]) =>
      rows.map((r) => ({
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: r.count,
      }));

    const t = totals.rows[0];
    res.json({
      issuedCount: t.issued,
      viewCount: t.views,
      downloadCount: t.downloads,
      shareCount: t.shares,
      verificationCount: t.verifications,
      activePrograms: programs.rows[0].active,
      issuanceTrend: series(issuance.rows),
      verificationTrend: series(verification.rows),
      shareTrend: series(shares.rows),
      // Referrer attribution is not captured. This used to return fixed
      // percentages of the view count — "LinkedIn Direct Share: 55%" — computed
      // from nothing. An empty array is the honest answer.
      trafficSources: [],
    });
  }),
);

// =============================================================================
// Internal: email drain
// =============================================================================

/**
 * Drains the email outbox.
 *
 * Registered for GET as well as POST because the Vercel scheduler issues a GET.
 * Guarded by CRON_SECRET, compared in constant time — it is a mutating endpoint
 * reachable from the public internet.
 *
 * Note on scheduling: `vercel.json` asks for every five minutes. On the Hobby
 * plan crons only fire once a day, so a real deployment either needs a paid plan,
 * Vercel Queues, or any external scheduler POSTing here with the bearer token.
 */
app.all(
  '/api/internal/email/drain',
  requireCronSecret,
  asyncHandler(async (req, res) => {
    if (!['GET', 'POST'].includes(req.method)) throw new HttpError(405, 'Method not allowed');
    const limit = Math.min(Number(req.query.limit ?? 25) || 25, 100);
    const result = await drainOutbox(limit);
    logger.info('Email drain complete', result);
    res.json(result);
  }),
);

// =============================================================================
// AI
// =============================================================================

async function generateGeminiContentWithRetry(ai: any, params: any, retries = 3, delay = 1500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const message = err?.message ?? '';
      const temporary = /503|429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(message);
      if (temporary && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini retries exhausted');
}

/**
 * The model returns SVG that we embed as a `data:image/svg+xml` background.
 * Browsers do not execute scripts inside an `<img>`, but the value is also
 * echoed into template records that other surfaces may render inline. Strip the
 * active constructs rather than trusting the model's output.
 */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '')
    .trim();
}

function requireGemini(): string {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, 'AI template generation is not configured');
  return env.GEMINI_API_KEY;
}

app.post(
  '/api/ai/generate-template',
  authenticate,
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { prompt, sampleImage } = parseBody(generateTemplateSchema, req.body);
    const apiKey = requireGemini();
    const ai = new GoogleGenAI({ apiKey });

    const guidance = `You are an expert graphic designer and certificate layout planner.
${sampleImage ? 'Analyze the uploaded sample certificate design image and generate a new certificate template that mimics its style, layout, border style, colors, background, and element placements as closely as possible.\nAlso consider this prompt:' : 'Generate a beautiful, modern, and professional certificate template design based on this prompt:'} "${prompt}".

Follow these strict design guidelines:
1. BACKGROUND & BORDERS:
   - Generate a clean, valid SVG certificate border and background design in the "svg" field. The SVG must have a viewBox of "0 0 1200 900" and contain absolutely NO text (<text>) elements. Use paths, rects, gradients, and filters for borders and backgrounds.
   - Specify background color and border color as hex codes in "backgroundColor" and "borderColor".
   - Specify border width in pixels in "borderWidth".

2. TEXT ELEMENT PLACEMENTS (ALIGNMENT & COORDINATES):
   - Map coordinates of all text elements to "xPercent" and "yPercent". These MUST be integers between 0 and 100, representing percentage offsets from the top-left corner of the canvas (Center is 50, 50). Do NOT use absolute pixels.
   - Choose the correct text alignment ("align": "left" | "center" | "right") for each element.
   - You MUST include at least one element with text "{{name}}" (having isPlaceholder: true) and one element with text "{{program}}" (having isPlaceholder: true).

3. LOGO, SIGNATURES, AND TRUST STAMPS:
   - Detect or place a logo, mapping to logoX (0-100), logoY (0-100), and logoWidth (50-150).
   - Place signatures: signatureX/Y (primary) and secondarySignatureX/Y (secondary), with widths, signatoryName, and signatoryTitle. Set showSecondarySignatory to true if two signatures are appropriate.
   - Place a QR code or seal: qrCodeX/Y, qrCodeWidth (16-80), showQrCode, showSeal, sealType, and sealWidth (20-100).`;

    const contents = sampleImage
      ? [{ inlineData: { data: sampleImage.data, mimeType: sampleImage.mimeType } }, { text: guidance }]
      : guidance;

    const response = await generateGeminiContentWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            svg: { type: Type.STRING, description: 'Raw SVG for background/borders. No text elements.' },
            backgroundColor: { type: Type.STRING },
            borderColor: { type: Type.STRING },
            borderWidth: { type: Type.INTEGER },
            logoX: { type: Type.INTEGER },
            logoY: { type: Type.INTEGER },
            logoWidth: { type: Type.INTEGER },
            signatureX: { type: Type.INTEGER },
            signatureY: { type: Type.INTEGER },
            signatureWidth: { type: Type.INTEGER },
            signatoryName: { type: Type.STRING },
            signatoryTitle: { type: Type.STRING },
            showSecondarySignatory: { type: Type.BOOLEAN },
            secondarySignatureX: { type: Type.INTEGER },
            secondarySignatureY: { type: Type.INTEGER },
            secondarySignatureWidth: { type: Type.INTEGER },
            secondarySignatoryName: { type: Type.STRING },
            secondarySignatoryTitle: { type: Type.STRING },
            showQrCode: { type: Type.BOOLEAN },
            qrCodeX: { type: Type.INTEGER },
            qrCodeY: { type: Type.INTEGER },
            qrCodeWidth: { type: Type.INTEGER },
            showSeal: { type: Type.BOOLEAN },
            sealType: {
              type: Type.STRING,
              enum: ['classic', 'modern', 'stellar', 'crimson_wax', 'emerald_shield', 'gold_medallion', 'none'],
            },
            sealWidth: { type: Type.INTEGER },
            textElements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  fontSize: { type: Type.INTEGER },
                  fontFamily: { type: Type.STRING, enum: ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono'] },
                  fontWeight: { type: Type.STRING, enum: ['normal', 'medium', 'bold'] },
                  color: { type: Type.STRING },
                  xPercent: { type: Type.INTEGER },
                  yPercent: { type: Type.INTEGER },
                  align: { type: Type.STRING, enum: ['left', 'center', 'right'] },
                  isPlaceholder: { type: Type.BOOLEAN },
                },
                required: ['text', 'fontSize', 'fontFamily', 'fontWeight', 'color', 'xPercent', 'yPercent', 'align'],
              },
            },
          },
          required: ['svg', 'textElements', 'backgroundColor', 'borderColor', 'borderWidth'],
        },
      },
    });

    if (!response.text) throw new HttpError(502, 'Empty response from the AI provider');

    const design = JSON.parse(response.text);
    const svg = sanitizeSvg(design.svg ?? '');

    res.json({
      backgroundColor: design.backgroundColor,
      borderColor: design.borderColor,
      borderWidth: design.borderWidth,
      backgroundImageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      textElements: (design.textElements ?? []).map((el: any, idx: number) => ({ id: `ai-el-${idx}`, ...el })),
      logoX: num(design.logoX),
      logoY: num(design.logoY),
      logoWidth: num(design.logoWidth),
      signatureX: num(design.signatureX),
      signatureY: num(design.signatureY),
      signatureWidth: num(design.signatureWidth),
      signatoryName: design.signatoryName || undefined,
      signatoryTitle: design.signatoryTitle || undefined,
      showSecondarySignatory: design.showSecondarySignatory ?? undefined,
      secondarySignatureX: num(design.secondarySignatureX),
      secondarySignatureY: num(design.secondarySignatureY),
      secondarySignatureWidth: num(design.secondarySignatureWidth),
      secondarySignatoryName: design.secondarySignatoryName || undefined,
      secondarySignatoryTitle: design.secondarySignatoryTitle || undefined,
      showQrCode: design.showQrCode ?? undefined,
      qrCodeX: num(design.qrCodeX),
      qrCodeY: num(design.qrCodeY),
      qrCodeWidth: num(design.qrCodeWidth),
      showSeal: design.showSeal ?? undefined,
      sealType: design.sealType || undefined,
      sealWidth: num(design.sealWidth),
    });
  }),
);

app.post(
  '/api/ai/parse-sample',
  authenticate,
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { sampleImage } = parseBody(parseSampleSchema, req.body);
    const apiKey = requireGemini();
    const ai = new GoogleGenAI({ apiKey });

    const response = await generateGeminiContentWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { data: sampleImage.data, mimeType: sampleImage.mimeType } },
        {
          text: `You are an expert certificate parser and analyzer.
Analyze the uploaded sample certificate image. Detect and extract all printed elements — text blocks, logos, signatures, and seals — so they can be covered by solid-colored patches and replaced with editable elements at their exact positions.

1. TEXT ELEMENTS:
   - Identify every line or block of text and return its exact detected string.
   - Estimate xPercent and yPercent as integers 0-100, the percentage offset of the block's center from the top-left.
   - Estimate width and height in pixels on a 1200x900 canvas.
   - Detect the background color immediately behind the block (hex) for the redaction patch, and the text color (hex).
   - Estimate fontSize, fontFamily ('Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono'), fontWeight ('normal', 'medium', 'bold'), and align.
   - A recipient name gets isPlaceholder=true and isNamePlaceholder=true; a program/course name gets isPlaceholder=true and isProgramPlaceholder=true.

2. LOGO, SIGNATURES, AND SEALS:
   - Locate each, return its type ('logo', 'signature', 'seal'), position, width, height, and surrounding background color.
   - For signatures and logos, set text="" and isPlaceholder=false.`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedElements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['text', 'logo', 'signature', 'seal'] },
                  text: { type: Type.STRING },
                  xPercent: { type: Type.INTEGER },
                  yPercent: { type: Type.INTEGER },
                  width: { type: Type.INTEGER },
                  height: { type: Type.INTEGER },
                  backgroundColor: { type: Type.STRING },
                  textColor: { type: Type.STRING },
                  fontSize: { type: Type.INTEGER },
                  fontFamily: { type: Type.STRING, enum: ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono'] },
                  fontWeight: { type: Type.STRING, enum: ['normal', 'medium', 'bold'] },
                  align: { type: Type.STRING, enum: ['left', 'center', 'right'] },
                  isPlaceholder: { type: Type.BOOLEAN },
                  isNamePlaceholder: { type: Type.BOOLEAN },
                  isProgramPlaceholder: { type: Type.BOOLEAN },
                },
                required: ['type', 'xPercent', 'yPercent', 'width', 'height', 'backgroundColor'],
              },
            },
          },
          required: ['detectedElements'],
        },
      },
    });

    if (!response.text) throw new HttpError(502, 'Empty response from the AI provider');
    res.json(JSON.parse(response.text));
  }),
);

// =============================================================================
// Public certificate page (server-rendered metadata)
// =============================================================================

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Removes the site-wide og:/twitter: defaults from index.html before the
 * certificate-specific ones are appended.
 *
 * Scrapers take the FIRST occurrence of a given og: property, not the last, so
 * simply appending left every certificate previewing as the generic
 * "Glint — Certificate Issuance & Verification" card. `og:site_name` is kept:
 * it is not per-certificate.
 */
function stripSocialMeta(html: string): string {
  return html.replace(
    /[ \t]*<meta\s+(?:property|name)="(?:og:(?:title|description|type|url|image)|twitter:[a-z_]+)"[^>]*>\s*\n?/gi,
    '',
  );
}

/**
 * `/c/:id` — the shareable link.
 *
 * The old link was `/#credential=<id>`. A URL fragment is never sent to the
 * server, so no per-certificate metadata could exist: pasting any certificate
 * into LinkedIn, WhatsApp, or Slack produced the same generic site-wide preview.
 * A real path lets us inject Open Graph tags before the SPA boots.
 */
async function renderCertificatePage(
  certificateId: string,
  loadHtml: (url: string) => Promise<string>,
  url: string,
): Promise<string> {
  const html = await loadHtml(url);

  const result = await pool.query(
    `SELECT c.recipient_name, c.program_name, c.status, w.brand_name, w.logo_url
     FROM certificates c
     LEFT JOIN workspaces w ON w.id = c.workspace_id
     WHERE c.id = $1`,
    [certificateId],
  );

  if (result.rows.length === 0) return html;
  const cert = result.rows[0];

  const title = `${cert.recipient_name} — ${cert.program_name}`;
  const description =
    cert.status === 'revoked'
      ? `This credential has been revoked by ${cert.brand_name ?? 'the issuer'}.`
      : `Verified credential issued to ${cert.recipient_name} by ${cert.brand_name ?? 'Glint'}.`;
  const pageUrl = `${env.appUrl}/c/${certificateId}`;

  // Crawlers cannot fetch a data: URI, so only an absolute https logo is useful.
  const image = typeof cert.logo_url === 'string' && cert.logo_url.startsWith('https://') ? cert.logo_url : null;

  const tags = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(pageUrl)}">`,
    image ? `<meta property="og:image" content="${escapeAttr(image)}">` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
    // A revoked credential must not be indexed as a valid one.
    cert.status === 'revoked' ? `<meta name="robots" content="noindex">` : '',
  ]
    .filter(Boolean)
    .join('\n    ');

  return stripSocialMeta(html)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(title)}</title>`)
    .replace('</head>', `    ${tags}\n  </head>`);
}

// =============================================================================
// Bootstrap
// =============================================================================

const PORT = env.PORT;

function mountApiFallback() {
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
}

async function startServer() {
  if (!env.isProd) {
    const vitePackage = 'vite';
    const { createServer: createViteServer } = await import(vitePackage);
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });

    app.get('/c/:id', async (req, res, next) => {
      try {
        const html = await renderCertificatePage(
          req.params.id,
          async (url) => vite.transformIndexHtml(url, fs.readFileSync(path.resolve('index.html'), 'utf-8')),
          req.originalUrl,
        );
        res.status(200).set('Content-Type', 'text/html').end(html);
      } catch (err) {
        vite.ssrFixStacktrace?.(err as Error);
        next(err);
      }
    });

    mountApiFallback();
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

    app.get('/c/:id', async (req, res, next) => {
      try {
        const html = await renderCertificatePage(req.params.id, async () => indexHtml, req.originalUrl);
        res.status(200).set('Content-Type', 'text/html').end(html);
      } catch (err) {
        next(err);
      }
    });

    mountApiFallback();
    app.use(express.static(distPath, { index: false, maxAge: '1y', immutable: true }));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Glint listening on http://localhost:${PORT} (${env.NODE_ENV})`);
    if (!env.mailConfigured) logger.warn('Mail transport not configured — issuance emails will be simulated.');
  });
}

if (env.isServerless) {
  // Vercel serves the static build itself; this function answers /api and /c/:id.
  //
  // `dist/index.html` is not part of a function bundle by default — it reaches
  // the runtime only because vercel.json declares it under
  // `functions["api/index.ts"].includeFiles`. Read it lazily and once.
  let cachedIndexHtml: string | null = null;
  const readIndexHtml = (): string => {
    if (cachedIndexHtml === null) {
      cachedIndexHtml = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf-8');
    }
    return cachedIndexHtml;
  };

  app.get(
    '/c/:id',
    asyncHandler(async (req, res) => {
      let html: string;
      try {
        html = await renderCertificatePage(req.params.id, async () => readIndexHtml(), req.originalUrl);
      } catch (err) {
        // Losing the metadata is bad; serving a blank page to a recipient who
        // followed a link from their email is worse. Hand them the SPA.
        logger.error('Failed to render certificate metadata; serving bare SPA', err);
        res.redirect(302, `/?c=${encodeURIComponent(req.params.id)}`);
        return;
      }
      res.status(200).set('Content-Type', 'text/html').end(html);
    }),
  );

  mountApiFallback();
  app.use(errorHandler);
  logger.info('Running in serverless mode.');
} else {
  void startServer();
}

export default app;
