/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seeds a freshly migrated database with the minimum needed to log in and see a
 * real, signed certificate end to end.
 *
 *   npm run db:seed
 *
 * Idempotent: re-running updates the admin password and leaves existing data
 * alone. It never invents certificates with fake signatures — every row it
 * writes is signed with the real CERT_SIGNING_KEY, so `POST /verify` returns
 * `verified: true` for it and would return `false` if anyone edited the row.
 *
 * The admin password comes from ADMIN_PASSWORD. If that is unset a strong one is
 * generated and printed exactly once. There is no default password.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import '../lib/env.js';
import { env } from '../lib/env.js';
import { pool, withTransaction } from '../lib/db.js';
import { newCertificateId, newId, signCertificate, SIGNATURE_ALG, SIGNATURE_VERSION } from '../lib/security.js';
import { STANDARD_TEMPLATE } from '../src/presets.js';

/**
 * `.env` files cannot express "absent" — an unused key is written as `FOO=""`,
 * and dotenv faithfully sets it to the empty string. `??` treats that as present.
 * Seeding the admin with an empty password is exactly the kind of thing that
 * ships quietly.
 */
const fromEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const ADMIN_EMAIL = (fromEnv('ADMIN_EMAIL') ?? 'admin@glint.local').toLowerCase();
const WORKSPACE_ID = 'ws-touchmark';
const TEMPLATE_ID = 'tpl-standard';
const PROGRAM_ID = 'prg-sample';

/** ~96 bits, unambiguous alphabet, no shell-hostile characters. */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(20), (b) => alphabet[b % alphabet.length]).join('');
}

const SAMPLE_RECIPIENTS = [
  { name: 'Ananya Krishnan', email: 'ananya.krishnan@example.com' },
  { name: 'Rahul Menon', email: 'rahul.menon@example.com' },
  { name: 'Priya Raghavan', email: 'priya.raghavan@example.com' },
];

async function main(): Promise<void> {
  const configured = fromEnv('ADMIN_PASSWORD');
  if (configured && configured.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters, or unset to auto-generate one.');
  }
  const password = configured ?? generatePassword();
  const generated = !configured;
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  await withTransaction(async (client) => {
    // ---- workspace -----------------------------------------------------------
    await client.query(
      `INSERT INTO workspaces
         (id, name, slug, plan, brand_name, primary_color, accent_color,
          sender_name, sender_email, white_label, footer_text, created_by_email)
       VALUES ($1, 'Touchmark', 'touchmark', 'enterprise', 'Touchmark',
               '#0F172A', '#1A73E8', 'Touchmark Certificates', $2, false,
               'Issued by Touchmark', $3)
       ON CONFLICT (id) DO UPDATE SET brand_name = EXCLUDED.brand_name`,
      [WORKSPACE_ID, env.mailFrom ?? null, ADMIN_EMAIL],
    );

    // ---- admin ---------------------------------------------------------------
    // token_version is bumped so any token minted against the previous password
    // stops working the moment the password is reset.
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, workspace_id)
       VALUES ($1, $2, $3, 'Platform Administrator', 'admin', $4)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = 'admin',
             token_version = users.token_version + 1,
             failed_login_attempts = 0,
             locked_until = NULL`,
      [newId('u'), ADMIN_EMAIL, passwordHash, WORKSPACE_ID],
    );

    // ---- the one standard template -------------------------------------------
    const t = STANDARD_TEMPLATE;
    await client.query(
      `INSERT INTO templates
         (id, workspace_id, name, layout, background_color, border_color, border_width,
          border_radius, border_style, decor_flourish, show_seal, seal_type, seal_width,
          show_qr_code, qr_code_x, qr_code_y, qr_code_width,
          logo_x, logo_y, logo_width,
          signature_x, signature_y, signature_width,
          show_secondary_signatory, secondary_signature_x, secondary_signature_y, secondary_signature_width,
          text_elements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
               $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       ON CONFLICT (id) DO UPDATE SET text_elements = EXCLUDED.text_elements, name = EXCLUDED.name`,
      [
        TEMPLATE_ID, WORKSPACE_ID, t.name, t.layout, t.backgroundColor, t.borderColor, t.borderWidth,
        t.borderRadius, t.borderStyle, t.decorFlourish, t.showSeal, t.sealType, t.sealWidth,
        t.showQrCode, t.qrCodeX, t.qrCodeY, t.qrCodeWidth,
        t.logoX, t.logoY, t.logoWidth,
        t.signatureX, t.signatureY, t.signatureWidth,
        t.showSecondarySignatory, t.secondarySignatureX, t.secondarySignatureY, t.secondarySignatureWidth,
        JSON.stringify(t.textElements),
      ],
    );

    // ---- a program -----------------------------------------------------------
    const issueDate = new Date().toISOString().slice(0, 10);
    await client.query(
      `INSERT INTO programs (id, workspace_id, name, description, template_id, issue_date, status, recipient_fields)
       VALUES ($1, $2, 'Sample Participation Program', 'Seeded so the verification page has something real to show.',
               $3, $4, 'active', '[]'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [PROGRAM_ID, WORKSPACE_ID, TEMPLATE_ID, issueDate],
    );

    // ---- genuinely signed certificates ---------------------------------------
    const issued: string[] = [];
    for (const recipient of SAMPLE_RECIPIENTS) {
      const id = newCertificateId();
      const signable = {
        id,
        workspaceId: WORKSPACE_ID,
        programId: PROGRAM_ID,
        programName: 'Sample Participation Program',
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        issueDate,
        expiryDate: null,
      };

      const inserted = await client.query(
        `INSERT INTO certificates
           (id, workspace_id, program_id, program_name, recipient_name, recipient_email,
            issue_date, status, signature, signature_alg, signature_version, issuer_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'valid', $8, $9, $10, $11)
         ON CONFLICT (program_id, recipient_email) WHERE status <> 'revoked' DO NOTHING
         RETURNING id`,
        [
          id, WORKSPACE_ID, PROGRAM_ID, signable.programName, recipient.name, recipient.email,
          issueDate, signCertificate(signable), SIGNATURE_ALG, SIGNATURE_VERSION,
          // Freeze the organization name at issue time, exactly as the live issue
          // path does (server.ts). Matches the workspace brand name seeded above.
          'Touchmark',
        ],
      );

      if (inserted.rows.length > 0) {
        await client.query(
          `INSERT INTO certificate_events (certificate_id, event, performed_by, details)
           VALUES ($1, 'ISSUED', 'seed', 'Seeded sample certificate')`,
          [id],
        );
        issued.push(id);
      }
    }

    if (issued.length > 0) {
      console.log(`\n  Issued ${issued.length} signed sample certificate(s):`);
      for (const id of issued) console.log(`    ${env.appUrl}/c/${id}`);
    } else {
      console.log('\n  Sample certificates already present.');
    }
  });

  console.log('\n  ─────────────────────────────────────────────');
  console.log('   Admin login');
  console.log(`     email:    ${ADMIN_EMAIL}`);
  if (generated) {
    console.log(`     password: ${password}`);
    console.log('\n   Generated once. Store it now — it is not recoverable.');
    console.log('   Set ADMIN_PASSWORD in .env.local to choose your own.');
  } else {
    console.log('     password: (from ADMIN_PASSWORD)');
  }
  console.log('  ─────────────────────────────────────────────\n');

  await pool.end();
}

main().catch(async (err) => {
  console.error('\n  Seed failed:', err.message ?? err, '\n');
  await pool.end().catch(() => {});
  process.exit(1);
});
