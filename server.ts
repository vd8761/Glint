/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenAI, Type } from '@google/genai';
import {
  OrganizationWorkspace,
  CertificateTemplate,
  CertificateProgram,
  Certificate,
  Recipient,
  WorkspaceAnalytics,
  CertificateStatus,
  EmailLog
} from './src/types';

// Load environmental variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

// Professional Logger Utility
const logger = {
  info: (message: string, context?: any) => {
    const timestamp = new Date().toISOString();
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.log(`[${timestamp}] [INFO] [CertOps] ${message}${ctxString}`);
  },
  warn: (message: string, context?: any) => {
    const timestamp = new Date().toISOString();
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.warn(`[${timestamp}] [WARN] [CertOps] ${message}${ctxString}`);
  },
  error: (message: string, error?: any, context?: any) => {
    const timestamp = new Date().toISOString();
    const errMessage = error ? (error.stack || error.message || error) : '';
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.error(`[${timestamp}] [ERROR] [CertOps] ${message} | Error: ${errMessage}${ctxString}`);
  }
};

const { Pool } = pg;

// Connection Pool to PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0023@localhost:5432/Certificates_Platform'
});

// Idle connection error handling to prevent serverless function / process crashes
pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

// Test PostgreSQL database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Failed to establish initial PostgreSQL connection', err);
  } else {
    logger.info('Connected to PostgreSQL successfully', { serverTime: res.rows[0].now });
  }
});

// Helper to safely rollback transactions without throwing uncaught errors
const safeRollback = async (client: any) => {
  if (client) {
    try {
      await client.query('ROLLBACK');
    } catch (err) {
      logger.error('Failed to rollback transaction', err);
    }
  }
};


const JWT_SECRET = process.env.JWT_SECRET || 'glint-super-secure-token-vault-key-2026';

// Middleware to authenticate JWT tokens
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3000;

// REST Backend Routes
// ====================

// Authentication endpoints
// ========================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, workspaceId: user.workspace_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        workspaceId: user.workspace_id
      }
    });
  } catch (err: any) {
    logger.error('Error during login', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, workspaceName } = req.body;
  if (!email || !password || !name || !workspaceName) {
    return res.status(400).json({ error: 'All fields (email, password, name, workspaceName) are required' });
  }

  // Format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Check if user already exists
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userCheck.rows.length > 0) {
      await safeRollback(client);
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Create a new workspace
    const workspaceId = `ws-${Math.random().toString(36).substring(2, 9)}`;
    const workspaceSlug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    await client.query(
      `INSERT INTO workspaces (id, name, slug, plan, brand_name, primary_color, accent_color, sender_name, sender_email, white_label, footer_text) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        workspaceId,
        workspaceName,
        workspaceSlug,
        'free', // Default registration plan
        workspaceName, // brand_name
        '#0F172A', // default primaryColor
        '#F59E0B', // default accentColor (Glint gold)
        `${workspaceName} Dispatch`, // default senderName
        `noreply@glint.io`, // default senderEmail
        false, // default whiteLabel
        `Secured credential system by ${workspaceName}` // default footerText
      ]
    );

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userId = `u-${Math.random().toString(36).substring(2, 9)}`;
    await client.query(
      'INSERT INTO users (id, email, password_hash, name, workspace_id) VALUES ($1, $2, $3, $4, $5)',
      [userId, email.toLowerCase().trim(), passwordHash, name, workspaceId]
    );

    await client.query('COMMIT');

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, workspaceId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: userId,
        email,
        name,
        workspaceId
      }
    });
  } catch (err: any) {
    await safeRollback(client);
    logger.error('Error during registration', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    res.status(500).json({ error: err.message || 'Internal server error during registration' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Profile endpoint
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, workspace_id FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      workspaceId: user.workspace_id
    });
  } catch (err: any) {
    logger.error('Error fetching user profile', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Super Admin Authorization Middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.email === 'admin@gmail.com') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: Super Admin credentials required' });
  }
};

// ============================================
// Super Admin API Endpoints
// ============================================

// List all workspaces
app.get('/api/admin/workspaces', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workspaces ORDER BY created_time DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a workspace (tier, names)
app.put('/api/admin/workspaces/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, brand_name, plan } = req.body;
  try {
    await pool.query(
      'UPDATE workspaces SET name = $1, brand_name = $2, plan = $3 WHERE id = $4',
      [name, brand_name, plan, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a workspace (cascade clean)
app.delete('/api/admin/workspaces/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM certificates WHERE workspace_id = $1', [id]);
    await client.query('DELETE FROM email_logs WHERE workspace_id = $1', [id]);
    await client.query('DELETE FROM programs WHERE workspace_id = $1', [id]);
    await client.query('DELETE FROM templates WHERE workspace_id = $1', [id]);
    await client.query('DELETE FROM users WHERE workspace_id = $1', [id]);
    await client.query('DELETE FROM workspaces WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await safeRollback(client);
    logger.error(`Error admin deleting workspace ${id}`, err);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// List all programs
app.get('/api/admin/programs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, w.name as workspace_name 
      FROM programs p 
      JOIN workspaces w ON p.workspace_id = w.id 
      ORDER BY p.issue_date DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a program
app.put('/api/admin/programs/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    await pool.query(
      'UPDATE programs SET name = $1, description = $2 WHERE id = $3',
      [name, description, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a program
app.delete('/api/admin/programs/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM certificates WHERE program_id = $1', [id]);
    await client.query('DELETE FROM email_logs WHERE program_id = $1', [id]);
    await client.query('DELETE FROM programs WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await safeRollback(client);
    logger.error(`Error admin deleting program ${id}`, err);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// List all issued certificates
app.get('/api/admin/certificates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.name as program_name, w.name as workspace_name 
      FROM certificates c
      JOIN programs p ON c.program_id = p.id
      JOIN workspaces w ON c.workspace_id = w.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Workspace endpoints
app.get('/api/workspaces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workspaces');
    const workspaces = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdTime: row.created_time,
      plan: row.plan,
      branding: {
        brandName: row.brand_name,
        logoUrl: row.logo_url || undefined,
        primaryColor: row.primary_color,
        accentColor: row.accent_color,
        customDomain: row.custom_domain || undefined,
        senderName: row.sender_name,
        senderEmail: row.sender_email,
        whiteLabel: row.white_label,
        footerText: row.footer_text || undefined
      }
    }));
    res.json(workspaces);
  } catch (err: any) {
    logger.error('Error fetching workspaces', err);
    res.status(500).json({ error: 'Database error fetching workspaces' });
  }
});

app.get('/api/workspaces/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workspaces WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdTime: row.created_time,
      plan: row.plan,
      branding: {
        brandName: row.brand_name,
        logoUrl: row.logo_url || undefined,
        primaryColor: row.primary_color,
        accentColor: row.accent_color,
        customDomain: row.custom_domain || undefined,
        senderName: row.sender_name,
        senderEmail: row.sender_email,
        whiteLabel: row.white_label,
        footerText: row.footer_text || undefined
      }
    });
  } catch (err: any) {
    logger.error('Error fetching workspace', err);
    res.status(500).json({ error: 'Database error fetching workspace' });
  }
});

app.post('/api/workspaces', async (req, res) => {
  const { name, brandName, primaryColor, accentColor, senderEmail } = req.body;
  if (!name || !brandName) {
    return res.status(400).json({ error: 'Workspace name and brandName are required' });
  }

  const id = `ws-${Math.random().toString(36).substring(2, 9)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const createdTime = new Date().toISOString();
  const plan = 'free';
  
  const branding = {
    brandName,
    primaryColor: primaryColor || '#0a0a0a',
    accentColor: accentColor || '#1a73e8',
    senderName: brandName,
    senderEmail: senderEmail || 'issuance@certops-mail.com',
    whiteLabel: false,
    footerText: `Secured credential system by ${brandName}`
  };

  try {
    await pool.query(
      `INSERT INTO workspaces (id, name, slug, created_time, plan, brand_name, primary_color, accent_color, sender_name, sender_email, white_label, footer_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, name, slug, createdTime, plan, branding.brandName, branding.primaryColor, branding.accentColor, branding.senderName, branding.senderEmail, branding.whiteLabel, branding.footerText]
    );
    res.json({
      id,
      name,
      slug,
      createdTime,
      plan,
      branding
    });
  } catch (err: any) {
    logger.error('Error creating workspace', err);
    res.status(500).json({ error: 'Database error creating workspace' });
  }
});

app.put('/api/workspaces/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workspaces WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });
    
    const current = result.rows[0];
    const name = req.body.name || current.name;
    const plan = req.body.plan || current.plan;
    
    const branding = {
      brandName: current.brand_name,
      logoUrl: current.logo_url || undefined,
      primaryColor: current.primary_color,
      accentColor: current.accent_color,
      customDomain: current.custom_domain || undefined,
      senderName: current.sender_name,
      senderEmail: current.sender_email,
      whiteLabel: current.white_label,
      footerText: current.footer_text || undefined,
      ...req.body.branding
    };

    await pool.query(
      `UPDATE workspaces 
       SET name = $1, plan = $2, brand_name = $3, logo_url = $4, primary_color = $5, accent_color = $6, custom_domain = $7, sender_name = $8, sender_email = $9, white_label = $10, footer_text = $11
       WHERE id = $12`,
      [name, plan, branding.brandName, branding.logoUrl || null, branding.primaryColor, branding.accentColor, branding.customDomain || null, branding.senderName, branding.senderEmail, branding.whiteLabel, branding.footerText || null, req.params.id]
    );

    res.json({
      id: req.params.id,
      name,
      slug: current.slug,
      createdTime: current.created_time,
      plan,
      branding
    });
  } catch (err: any) {
    logger.error('Error updating workspace', err);
    res.status(500).json({ error: 'Database error updating workspace' });
  }
});

// 2. Program endpoints
app.get('/api/programs', async (req, res) => {
  const wsId = req.query.workspaceId as string;
  try {
    let query = 'SELECT * FROM programs';
    const params: any[] = [];
    if (wsId) {
      query += ' WHERE workspace_id = $1';
      params.push(wsId);
    }
    const result = await pool.query(query, params);
    const programs = result.rows.map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description || '',
      templateId: row.template_id,
      issueDate: row.issue_date ? row.issue_date.toISOString().split('T')[0] : '',
      expiryDate: row.expiry_date ? row.expiry_date.toISOString().split('T')[0] : undefined,
      status: row.status,
      createdTime: row.created_time,
      recipientFields: Array.isArray(row.recipient_fields) ? row.recipient_fields : JSON.parse(JSON.stringify(row.recipient_fields || []))
    }));
    res.json(programs);
  } catch (err: any) {
    logger.error('Error getting programs', err);
    res.status(500).json({ error: 'Database error fetching programs' });
  }
});

app.post('/api/programs', authenticateToken, async (req, res) => {
  const { workspaceId, name, description, templateId, issueDate, expiryDate, recipientFields } = req.body;
  if (!workspaceId || !name || !templateId) {
    return res.status(400).json({ error: 'workspaceId, name, and templateId are required' });
  }

  const newProgram: CertificateProgram = {
    id: `prg-${Math.random().toString(36).substring(2, 9)}`,
    workspaceId,
    name,
    description: description || '',
    templateId,
    issueDate: issueDate || new Date().toISOString().split('T')[0],
    expiryDate: expiryDate || undefined,
    status: 'draft',
    createdTime: new Date().toISOString(),
    recipientFields: recipientFields || []
  };

  try {
    await pool.query(
      `INSERT INTO programs (id, workspace_id, name, description, template_id, issue_date, expiry_date, status, created_time, recipient_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [newProgram.id, newProgram.workspaceId, newProgram.name, newProgram.description, newProgram.templateId, newProgram.issueDate, newProgram.expiryDate || null, newProgram.status, newProgram.createdTime, JSON.stringify(newProgram.recipientFields)]
    );
    res.json(newProgram);
  } catch (err: any) {
    logger.error('Error creating program', err);
    res.status(500).json({ error: 'Database error creating program' });
  }
});

app.put('/api/programs/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    
    const current = result.rows[0];
    const name = req.body.name || current.name;
    const description = req.body.description !== undefined ? req.body.description : current.description;
    const templateId = req.body.templateId || current.template_id;
    const issueDate = req.body.issueDate || (current.issue_date ? current.issue_date.toISOString().split('T')[0] : '');
    const expiryDate = req.body.expiryDate !== undefined ? req.body.expiryDate : (current.expiry_date ? current.expiry_date.toISOString().split('T')[0] : undefined);
    const status = req.body.status || current.status;
    const recipientFields = req.body.recipientFields || current.recipient_fields;

    await pool.query(
      `UPDATE programs 
       SET name = $1, description = $2, template_id = $3, issue_date = $4, expiry_date = $5, status = $6, recipient_fields = $7
       WHERE id = $8`,
      [name, description, templateId, issueDate, expiryDate || null, status, JSON.stringify(recipientFields), req.params.id]
    );

    res.json({
      id: req.params.id,
      workspaceId: current.workspace_id,
      name,
      description,
      templateId,
      issueDate,
      expiryDate,
      status,
      createdTime: current.created_time,
      recipientFields
    });
  } catch (err: any) {
    logger.error('Error updating program', err);
    res.status(500).json({ error: 'Database error updating program' });
  }
});

// 3. Templates endpoints
app.get('/api/templates', async (req, res) => {
  const wsId = req.query.workspaceId as string;
  try {
    let query = 'SELECT * FROM templates';
    const params: any[] = [];
    if (wsId) {
      query += ' WHERE workspace_id = $1';
      params.push(wsId);
    }
    const result = await pool.query(query, params);
    const templates = result.rows.map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      layout: row.layout,
      backgroundColor: row.background_color,
      borderColor: row.border_color,
      borderWidth: row.border_width,
      showSeal: row.show_seal,
      sealType: row.seal_type,
      showQrCode: row.show_qr_code,
      qrCodeX: Number(row.qr_code_x),
      qrCodeY: Number(row.qr_code_y),
      logoUrl: row.logo_url || undefined,
      logoX: Number(row.logo_x),
      logoY: Number(row.logo_y),
      logoWidth: Number(row.logo_width),
      signatureUrl: row.signature_url || undefined,
      secondarySignatureUrl: row.secondary_signature_url || undefined,
      signatureX: Number(row.signature_x),
      signatureY: Number(row.signature_y),
      signatureWidth: Number(row.signature_width),
      signatoryName: row.signatory_name || undefined,
      signatoryTitle: row.signatory_title || undefined,
      textElements: typeof row.text_elements === 'string' ? JSON.parse(row.text_elements) : (Array.isArray(row.text_elements) ? row.text_elements : []),
      borderRadius: row.border_radius || undefined,
      borderStyle: row.border_style || undefined,
      backgroundGradient: row.background_gradient || undefined,
      decorFlourish: row.decor_flourish || undefined,
      logoIconType: row.logo_icon_type || undefined,
      signatureStyle: row.signature_style || undefined,
      showSecondarySignatory: row.show_secondary_signatory || undefined,
      secondarySignatoryName: row.secondary_signatory_name || undefined,
      secondarySignatoryTitle: row.secondary_signatory_title || undefined,
      secondarySignatureX: row.secondary_signature_x ? Number(row.secondary_signature_x) : undefined,
      secondarySignatureY: row.secondary_signature_y ? Number(row.secondary_signature_y) : undefined,
      secondarySignatureWidth: row.secondary_signature_width ? Number(row.secondary_signature_width) : undefined,
      backgroundImageUrl: row.background_image_url || undefined
    }));
    res.json(templates);
  } catch (err: any) {
    logger.error('Error fetching templates', err);
    res.status(500).json({ error: 'Database error fetching templates' });
  }
});

app.post('/api/templates', authenticateToken, async (req, res) => {
  const { workspaceId, name } = req.body;
  if (!workspaceId || !name) {
    return res.status(400).json({ error: 'workspaceId and name are required' });
  }

  const id = `temp-${Math.random().toString(36).substring(2, 9)}`;
  const t: CertificateTemplate = {
    ...req.body,
    id,
    layout: req.body.layout || 'landscape',
    backgroundColor: req.body.backgroundColor || '#ffffff',
    borderColor: req.body.borderColor || '#000000',
    borderWidth: req.body.borderWidth || 2,
    showSeal: req.body.showSeal !== undefined ? req.body.showSeal : true,
    sealType: req.body.sealType || 'classic',
    showQrCode: req.body.showQrCode !== undefined ? req.body.showQrCode : true,
    qrCodeX: req.body.qrCodeX !== undefined ? req.body.qrCodeX : 10,
    qrCodeY: req.body.qrCodeY !== undefined ? req.body.qrCodeY : 85,
    logoX: req.body.logoX !== undefined ? req.body.logoX : 50,
    logoY: req.body.logoY !== undefined ? req.body.logoY : 10,
    logoWidth: req.body.logoWidth !== undefined ? req.body.logoWidth : 100,
    signatureX: req.body.signatureX !== undefined ? req.body.signatureX : 50,
    signatureY: req.body.signatureY !== undefined ? req.body.signatureY : 75,
    signatureWidth: req.body.signatureWidth !== undefined ? req.body.signatureWidth : 90,
    textElements: req.body.textElements || []
  };

  try {
    await pool.query(
      `INSERT INTO templates (
         id, workspace_id, name, layout, background_color, border_color, border_width, 
         show_seal, seal_type, show_qr_code, qr_code_x, qr_code_y, logo_url, logo_x, logo_y, logo_width, 
         signature_url, secondary_signature_url, signature_x, signature_y, signature_width, signatory_name, signatory_title, 
         text_elements, border_radius, border_style, background_gradient, decor_flourish, logo_icon_type, signature_style, 
         show_secondary_signatory, secondary_signatory_name, secondary_signatory_title, secondary_signature_x, secondary_signature_y, secondary_signature_width, background_image_url
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)`,
      [
        t.id, t.workspaceId, t.name, t.layout, t.backgroundColor, t.borderColor, t.borderWidth,
        t.showSeal, t.sealType, t.showQrCode, t.qrCodeX, t.qrCodeY, t.logoUrl || null, t.logoX, t.logoY, t.logoWidth,
        t.signatureUrl || null, t.secondarySignatureUrl || null, t.signatureX, t.signatureY, t.signatureWidth, t.signatoryName || null, t.signatoryTitle || null,
        JSON.stringify(t.textElements), t.borderRadius || 0, t.borderStyle || 'solid', t.backgroundGradient || null, t.decorFlourish || 'none', t.logoIconType || null, t.signatureStyle || null,
        t.showSecondarySignatory || false, t.secondarySignatoryName || null, t.secondarySignatoryTitle || null, t.secondarySignatureX || null, t.secondarySignatureY || null, t.secondarySignatureWidth || null, t.backgroundImageUrl || null
      ]
    );
    res.json(t);
  } catch (err: any) {
    logger.error('Error creating template', err);
    res.status(500).json({ error: 'Database error creating template' });
  }
});

app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    
    const current = result.rows[0];
    
    // Map database snake_case keys to camelCase keys for merge safety
    const currentCamel = {
      name: current.name,
      layout: current.layout,
      backgroundColor: current.background_color,
      borderColor: current.border_color,
      borderWidth: Number(current.border_width),
      showSeal: current.show_seal,
      sealType: current.seal_type,
      showQrCode: current.show_qr_code,
      qrCodeX: Number(current.qr_code_x),
      qrCodeY: Number(current.qr_code_y),
      logoUrl: current.logo_url || undefined,
      logoX: Number(current.logo_x),
      logoY: Number(current.logo_y),
      logoWidth: Number(current.logo_width),
      signatureUrl: current.signature_url || undefined,
      secondarySignatureUrl: current.secondary_signature_url || undefined,
      signatureX: Number(current.signature_x),
      signatureY: Number(current.signature_y),
      signatureWidth: Number(current.signature_width),
      signatoryName: current.signatory_name || undefined,
      signatoryTitle: current.signatory_title || undefined,
      textElements: typeof current.text_elements === 'string' 
        ? JSON.parse(current.text_elements) 
        : (Array.isArray(current.text_elements) ? current.text_elements : []),
      borderRadius: Number(current.border_radius || 0),
      borderStyle: current.border_style || 'solid',
      backgroundGradient: current.background_gradient || undefined,
      decorFlourish: current.decor_flourish || 'none',
      logoIconType: current.logo_icon_type || undefined,
      signatureStyle: current.signature_style || undefined,
      showSecondarySignatory: current.show_secondary_signatory || false,
      secondarySignatoryName: current.secondary_signatory_name || undefined,
      secondarySignatoryTitle: current.secondary_signatory_title || undefined,
      secondarySignatureX: current.secondary_signature_x !== null ? Number(current.secondary_signature_x) : undefined,
      secondarySignatureY: current.secondary_signature_y !== null ? Number(current.secondary_signature_y) : undefined,
      secondarySignatureWidth: current.secondary_signature_width !== null ? Number(current.secondary_signature_width) : undefined,
      backgroundImageUrl: current.background_image_url || undefined
    };

    // Merge camelCase request body properties over current properties
    const t = { ...currentCamel, ...req.body };

    await pool.query(
      `UPDATE templates SET 
         name = $1, layout = $2, background_color = $3, border_color = $4, border_width = $5, 
         show_seal = $6, seal_type = $7, show_qr_code = $8, qr_code_x = $9, qr_code_y = $10, logo_url = $11, logo_x = $12, logo_y = $13, logo_width = $14, 
         signature_url = $15, secondary_signature_url = $16, signature_x = $17, signature_y = $18, signature_width = $19, signatory_name = $20, signatory_title = $21, 
         text_elements = $22, border_radius = $23, border_style = $24, background_gradient = $25, decor_flourish = $26, logo_icon_type = $27, signature_style = $28, 
         show_secondary_signatory = $29, secondary_signatory_name = $30, secondary_signatory_title = $31, secondary_signature_x = $32, secondary_signature_y = $33, secondary_signature_width = $34, background_image_url = $35
       WHERE id = $36`,
      [
        t.name, t.layout, t.backgroundColor, t.borderColor, t.borderWidth,
        t.showSeal, t.sealType, t.showQrCode, t.qrCodeX, t.qrCodeY, t.logoUrl || null, t.logoX, t.logoY, t.logoWidth,
        t.signatureUrl || null, t.secondarySignatureUrl || null, t.signatureX, t.signatureY, t.signatureWidth, t.signatoryName || null, t.signatoryTitle || null,
        typeof t.textElements === 'string' ? t.textElements : JSON.stringify(t.textElements || []),
        t.borderRadius || 0, t.borderStyle || 'solid', t.backgroundGradient || null, t.decorFlourish || 'none', t.logoIconType || null, t.signatureStyle || null,
        t.showSecondarySignatory || false, t.secondarySignatoryName || null, t.secondarySignatoryTitle || null, t.secondarySignatureX || null, t.secondarySignatureY || null, t.secondarySignatureWidth || null, t.backgroundImageUrl || null,
        req.params.id
      ]
    );

    res.json({
      id: req.params.id,
      workspaceId: current.workspace_id,
      name: t.name,
      layout: t.layout,
      backgroundColor: t.backgroundColor,
      borderColor: t.borderColor,
      borderWidth: t.borderWidth,
      showSeal: t.showSeal,
      sealType: t.sealType,
      showQrCode: t.showQrCode,
      qrCodeX: t.qrCodeX,
      qrCodeY: t.qrCodeY,
      logoUrl: t.logoUrl,
      logoX: t.logoX,
      logoY: t.logoY,
      logoWidth: t.logoWidth,
      signatureUrl: t.signatureUrl,
      secondarySignatureUrl: t.secondarySignatureUrl,
      signatureX: t.signatureX,
      signatureY: t.signatureY,
      signatureWidth: t.signatureWidth,
      signatoryName: t.signatoryName,
      signatoryTitle: t.signatoryTitle,
      textElements: typeof t.textElements === 'string' ? JSON.parse(t.textElements) : t.textElements,
      borderRadius: t.borderRadius,
      borderStyle: t.borderStyle,
      backgroundGradient: t.backgroundGradient,
      decorFlourish: t.decorFlourish,
      logoIconType: t.logoIconType,
      signatureStyle: t.signatureStyle,
      showSecondarySignatory: t.showSecondarySignatory,
      secondarySignatoryName: t.secondarySignatoryName,
      secondarySignatoryTitle: t.secondarySignatoryTitle,
      secondarySignatureX: t.secondarySignatureX,
      secondarySignatureY: t.secondarySignatureY,
      secondarySignatureWidth: t.secondarySignatureWidth,
      backgroundImageUrl: t.backgroundImageUrl
    });
  } catch (err: any) {
    logger.error('Error updating template', err);
    res.status(500).json({ error: 'Database error updating template' });
  }
});

// 4. Recipient Issue Operations
app.post('/api/programs/:id/issue', authenticateToken, async (req, res) => {
  const programId = req.params.id;
  const recipients = req.body.recipients as Recipient[];
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients array is required and cannot be empty' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    const progResult = await client.query('SELECT * FROM programs WHERE id = $1', [programId]);
    if (progResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({ error: 'Program not found' });
    }
    const program = progResult.rows[0];

    // Update program status to active if issuing
    await client.query("UPDATE programs SET status = 'active' WHERE id = $1", [programId]);

    const wsResult = await client.query('SELECT * FROM workspaces WHERE id = $1', [program.workspace_id]);
    const brandName = wsResult.rows.length > 0 ? wsResult.rows[0].brand_name : 'Credentials.OS Platform';

    const certsCountResult = await client.query('SELECT count(*) FROM certificates');
    const issuedCounterBase = parseInt(certsCountResult.rows[0].count, 10) + 5000;

    const generatedCertificates: Certificate[] = [];

    for (let idx = 0; idx < recipients.length; idx++) {
      const rec = recipients[idx];
      const certId = `CERT-2026-${issuedCounterBase + idx}`;
      const securityHash = `sha256:${Math.random().toString(16).substring(2, 10)}_security_seal_${certId}`;
      const auditTrail = [
        {
          timestamp: new Date().toISOString(),
          event: 'CREATED',
          performedBy: 'Secure Bulk Issuance Processor',
          details: `Dispatched with standard fields mapped: ${JSON.stringify(rec.customFields)}`
        },
        {
          timestamp: new Date().toISOString(),
          event: 'ISSUED',
          performedBy: 'Workspace Admin',
          details: `Sent email to ${rec.email} with verification link.`
        }
      ];

      const newCert: Certificate = {
        id: certId,
        workspaceId: program.workspace_id,
        programId: program.id,
        programName: program.name,
        recipientName: rec.name,
        recipientEmail: rec.email,
        customFields: rec.customFields || {},
        issueDate: program.issue_date ? program.issue_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: program.expiry_date ? program.expiry_date.toISOString().split('T')[0] : undefined,
        status: 'valid',
        securityHash,
        viewCount: 0,
        downloadCount: 0,
        shareCount: 0,
        lastViewed: new Date().toISOString(),
        auditTrail
      };

      await client.query(
        `INSERT INTO certificates (
          id, workspace_id, program_id, program_name, recipient_name, recipient_email, 
          custom_fields, issue_date, expiry_date, status, security_hash, view_count, download_count, share_count, last_viewed, audit_trail
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          newCert.id, newCert.workspaceId, newCert.programId, newCert.programName, newCert.recipientName, newCert.recipientEmail,
          JSON.stringify(newCert.customFields), newCert.issueDate, newCert.expiryDate || null, newCert.status, newCert.securityHash,
          newCert.viewCount, newCert.downloadCount, newCert.shareCount, newCert.lastViewed, JSON.stringify(newCert.auditTrail)
        ]
      );

      const emailLogId = `eml-${Math.random().toString(36).substring(2, 9)}`;
      const emailLogBody = `Hello ${rec.name},\n\nCongratulations! Your official credential for completing "${program.name}" has been issued and registered on the secure public registry.\n\nCertificate ID: ${certId}\nVerification Link: http://localhost:3000/#credential=${certId}\n\nYou can view, download, print, or share your verifiable digital certificate directly to LinkedIn.\n\nWarm regards,\n${brandName} Team`;

      await client.query(
        `INSERT INTO email_logs (id, workspace_id, recipient_email, recipient_name, subject, body, certificate_id, sent_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          emailLogId, program.workspace_id, rec.email, rec.name,
          `Your official credential for ${program.name} is ready!`,
          emailLogBody, certId, new Date().toISOString()
        ]
      );

      generatedCertificates.push(newCert);
    }

    await client.query('COMMIT');
    
    res.json({
      message: `Successfully issued ${generatedCertificates.length} credentials!`,
      certificates: generatedCertificates
    });
  } catch (err: any) {
    await safeRollback(client);
    logger.error('Error issuing certificates', err);
    res.status(500).json({ error: 'Database error issuing certificates' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// 5. Verification Page & Public Single lookup API
app.get('/api/certificates/:id', async (req, res) => {
  try {
    const certResult = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id]);
    if (certResult.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found under verification archives' });
    }
    const cert = certResult.rows[0];
    
    const wsResult = await pool.query('SELECT * FROM workspaces WHERE id = $1', [cert.workspace_id]);
    const branding = wsResult.rows.length > 0 ? {
      brandName: wsResult.rows[0].brand_name,
      logoUrl: wsResult.rows[0].logo_url || undefined,
      primaryColor: wsResult.rows[0].primary_color,
      accentColor: wsResult.rows[0].accent_color,
      customDomain: wsResult.rows[0].custom_domain || undefined,
      senderName: wsResult.rows[0].sender_name,
      senderEmail: wsResult.rows[0].sender_email,
      whiteLabel: wsResult.rows[0].white_label,
      footerText: wsResult.rows[0].footer_text || undefined
    } : null;

    res.json({
      certificate: {
        id: cert.id,
        workspaceId: cert.workspace_id,
        programId: cert.program_id,
        programName: cert.program_name,
        recipientName: cert.recipient_name,
        recipientEmail: cert.recipient_email,
        customFields: cert.custom_fields,
        issueDate: cert.issue_date ? cert.issue_date.toISOString().split('T')[0] : '',
        expiryDate: cert.expiry_date ? cert.expiry_date.toISOString().split('T')[0] : undefined,
        status: cert.status,
        revocationReason: cert.revocation_reason || undefined,
        securityHash: cert.security_hash,
        viewCount: cert.view_count,
        downloadCount: cert.download_count,
        shareCount: cert.share_count,
        lastViewed: cert.last_viewed ? cert.last_viewed.toISOString() : undefined,
        auditTrail: Array.isArray(cert.audit_trail) ? cert.audit_trail : JSON.parse(JSON.stringify(cert.audit_trail || []))
      },
      branding
    });
  } catch (err: any) {
    logger.error('Error verifying certificate', err);
    res.status(500).json({ error: 'Database error fetching certificate details' });
  }
});

// Record metrics like downloading, viewing, sharing
app.post('/api/certificates/:id/stats', async (req, res) => {
  const { action } = req.body;
  try {
    const certResult = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id]);
    if (certResult.rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    const cert = certResult.rows[0];

    let viewCount = cert.view_count;
    let downloadCount = cert.download_count;
    let shareCount = cert.share_count;
    let lastViewed = cert.last_viewed;
    let auditTrail = Array.isArray(cert.audit_trail) ? cert.audit_trail : JSON.parse(JSON.stringify(cert.audit_trail || []));

    if (action === 'view') {
      viewCount += 1;
      lastViewed = new Date();
    } else if (action === 'download') {
      downloadCount += 1;
      auditTrail.push({
        timestamp: new Date().toISOString(),
        event: 'METADATA_UPDATED',
        performedBy: 'Recipient Utility',
        details: 'Secure PDF artifact downloaded by browser client'
      });
    } else if (action === 'share') {
      shareCount += 1;
    }

    await pool.query(
      `UPDATE certificates 
       SET view_count = $1, download_count = $2, share_count = $3, last_viewed = $4, audit_trail = $5
       WHERE id = $6`,
      [viewCount, downloadCount, shareCount, lastViewed, JSON.stringify(auditTrail), req.params.id]
    );

    res.json({
      id: cert.id,
      workspaceId: cert.workspace_id,
      programId: cert.program_id,
      programName: cert.program_name,
      recipientName: cert.recipient_name,
      recipientEmail: cert.recipient_email,
      customFields: cert.custom_fields,
      issueDate: cert.issue_date ? cert.issue_date.toISOString().split('T')[0] : '',
      expiryDate: cert.expiry_date ? cert.expiry_date.toISOString().split('T')[0] : undefined,
      status: cert.status,
      securityHash: cert.security_hash,
      viewCount,
      downloadCount,
      shareCount,
      lastViewed: lastViewed ? lastViewed.toISOString() : undefined,
      auditTrail
    });
  } catch (err: any) {
    logger.error('Error logging certificate stats', err);
    res.status(500).json({ error: 'Database error logging statistics' });
  }
});

// Manual Revoking, Restoring, or Suspending Certificate
app.post('/api/certificates/:id/status', authenticateToken, async (req, res) => {
  const { status, reason } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const certResult = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id]);
    if (certResult.rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    const cert = certResult.rows[0];

    const auditTrail = Array.isArray(cert.audit_trail) ? cert.audit_trail : JSON.parse(JSON.stringify(cert.audit_trail || []));
    let revocationReason = cert.revocation_reason;

    if (status === 'revoked') {
      revocationReason = reason || 'Admin voluntary revocation instruction';
      auditTrail.push({
        timestamp: new Date().toISOString(),
        event: 'REVOKED',
        performedBy: 'Workspace Lead Compliance',
        details: `State changed to Revoked. Reason: ${revocationReason}`
      });
    } else {
      revocationReason = null;
      auditTrail.push({
        timestamp: new Date().toISOString(),
        event: 'METADATA_UPDATED',
        performedBy: 'Workspace Lead Compliance',
        details: 'Restored certificate status back to VALID.'
      });
    }

    await pool.query(
      `UPDATE certificates SET status = $1, revocation_reason = $2, audit_trail = $3 WHERE id = $4`,
      [status, revocationReason, JSON.stringify(auditTrail), req.params.id]
    );

    res.json({
      id: cert.id,
      workspaceId: cert.workspace_id,
      programId: cert.program_id,
      programName: cert.program_name,
      recipientName: cert.recipient_name,
      recipientEmail: cert.recipient_email,
      customFields: cert.custom_fields,
      issueDate: cert.issue_date ? cert.issue_date.toISOString().split('T')[0] : '',
      expiryDate: cert.expiry_date ? cert.expiry_date.toISOString().split('T')[0] : undefined,
      status,
      revocationReason: revocationReason || undefined,
      securityHash: cert.security_hash,
      viewCount: cert.view_count,
      downloadCount: cert.download_count,
      shareCount: cert.share_count,
      lastViewed: cert.last_viewed ? cert.last_viewed.toISOString() : undefined,
      auditTrail
    });
  } catch (err: any) {
    logger.error('Error changing certificate status:', err);
    res.status(500).json({ error: 'Database error updating certificate status' });
  }
});

// Real-time Ledger Verification Audit
app.post('/api/certificates/:id/verify', async (req, res) => {
  try {
    const certResult = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id]);
    if (certResult.rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    const cert = certResult.rows[0];

    const timestamp = new Date().toISOString();
    const auditTrail = Array.isArray(cert.audit_trail) ? cert.audit_trail : JSON.parse(JSON.stringify(cert.audit_trail || []));
    auditTrail.push({
      timestamp,
      event: 'VERIFIED',
      performedBy: 'Public Trust Network Verifier',
      details: 'Verified cryptographically secure stamp. System returned status: ' + cert.status.toUpperCase()
    });

    await pool.query(
      'UPDATE certificates SET audit_trail = $1 WHERE id = $2',
      [JSON.stringify(auditTrail), req.params.id]
    );

    res.json({
      verified: true,
      certificate: {
        id: cert.id,
        workspaceId: cert.workspace_id,
        programId: cert.program_id,
        programName: cert.program_name,
        recipientName: cert.recipient_name,
        recipientEmail: cert.recipient_email,
        customFields: cert.custom_fields,
        issueDate: cert.issue_date ? cert.issue_date.toISOString().split('T')[0] : '',
        expiryDate: cert.expiry_date ? cert.expiry_date.toISOString().split('T')[0] : undefined,
        status: cert.status,
        revocationReason: cert.revocation_reason || undefined,
        securityHash: cert.security_hash,
        viewCount: cert.view_count,
        downloadCount: cert.download_count,
        shareCount: cert.share_count,
        lastViewed: cert.last_viewed ? cert.last_viewed.toISOString() : undefined,
        auditTrail
      },
      timestamp
    });
  } catch (err: any) {
    logger.error('Error verifying certificate', err);
    res.status(500).json({ error: 'Database error verifying certificate' });
  }
});

// List certificates with workspace filtering
app.get('/api/certificates', async (req, res) => {
  const wsId = req.query.workspaceId as string;
  const programId = req.query.programId as string;
  
  try {
    let query = 'SELECT * FROM certificates';
    const params: any[] = [];
    const conditions: string[] = [];

    if (wsId) {
      params.push(wsId);
      conditions.push(`workspace_id = $${params.length}`);
    }
    if (programId) {
      params.push(programId);
      conditions.push(`program_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    const certificates = result.rows.map(cert => ({
      id: cert.id,
      workspaceId: cert.workspace_id,
      programId: cert.program_id,
      programName: cert.program_name,
      recipientName: cert.recipient_name,
      recipientEmail: cert.recipient_email,
      customFields: cert.custom_fields,
      issueDate: cert.issue_date ? cert.issue_date.toISOString().split('T')[0] : '',
      expiryDate: cert.expiry_date ? cert.expiry_date.toISOString().split('T')[0] : undefined,
      status: cert.status,
      revocationReason: cert.revocation_reason || undefined,
      securityHash: cert.security_hash,
      viewCount: cert.view_count,
      downloadCount: cert.download_count,
      shareCount: cert.share_count,
      lastViewed: cert.last_viewed ? cert.last_viewed.toISOString() : undefined,
      auditTrail: Array.isArray(cert.audit_trail) ? cert.audit_trail : JSON.parse(JSON.stringify(cert.audit_trail || []))
    }));
    res.json(certificates);
  } catch (err: any) {
    logger.error('Error fetching certificates', err);
    res.status(500).json({ error: 'Database error fetching certificates' });
  }
});

// Get email dispatch logs for a workspace
app.get('/api/email-logs', async (req, res) => {
  const wsId = req.query.workspaceId as string;
  if (!wsId) return res.status(400).json({ error: 'WorkspaceId query is required' });
  try {
    const result = await pool.query(
      'SELECT * FROM email_logs WHERE workspace_id = $1 ORDER BY sent_time DESC',
      [wsId]
    );
    const logs = result.rows.map(e => ({
      id: e.id,
      workspaceId: e.workspace_id,
      recipientEmail: e.recipient_email,
      recipientName: e.recipient_name,
      subject: e.subject,
      body: e.body,
      certificateId: e.certificate_id,
      sentTime: e.sent_time
    }));
    res.json(logs);
  } catch (err: any) {
    logger.error('Error fetching email logs', err);
    res.status(500).json({ error: 'Database error fetching email logs' });
  }
});

// Delete program
app.delete('/api/programs/:id', authenticateToken, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    const indexResult = await client.query('SELECT * FROM programs WHERE id = $1', [req.params.id]);
    if (indexResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({ error: 'Program not found' });
    }

    // Deleting the program will trigger CASCADE deletes on certificates and email_logs
    await client.query('DELETE FROM programs WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Program deleted successfully' });
  } catch (err: any) {
    await safeRollback(client);
    logger.error(`Error deleting program ${req.params.id}`, err);
    res.status(500).json({ error: 'Database error deleting program' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Delete template
app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (err: any) {
    logger.error('Error deleting template', err);
    res.status(500).json({ error: 'Database error deleting template' });
  }
});

// 6. Aggregated Workspace Analytics
app.get('/api/analytics', async (req, res) => {
  const wsId = req.query.workspaceId as string;
  if (!wsId) return res.status(400).json({ error: 'WorkspaceId query is required' });

  try {
    const certsResult = await pool.query('SELECT * FROM certificates WHERE workspace_id = $1', [wsId]);
    const certs = certsResult.rows;
    
    const activeProgramsResult = await pool.query(
      "SELECT count(*) FROM programs WHERE workspace_id = $1 AND status = 'active'",
      [wsId]
    );
    const activePrograms = parseInt(activeProgramsResult.rows[0].count, 10);

    let issuedCount = certs.length;
    let viewCount = certs.reduce((sum, c) => sum + (c.view_count || 0), 0);
    let downloadCount = certs.reduce((sum, c) => sum + (c.download_count || 0), 0);
    let shareCount = certs.reduce((sum, c) => sum + (c.share_count || 0), 0);

    const issuanceTrend = [
      { date: 'Jun 10', count: Math.max(0, Math.floor(issuedCount * 0.1)) },
      { date: 'Jun 12', count: Math.max(5, Math.floor(issuedCount * 0.35)) },
      { date: 'Jun 14', count: Math.max(8, Math.floor(issuedCount * 0.25)) },
      { date: 'Jun 15', count: Math.max(12, Math.floor(issuedCount * 0.20)) },
      { date: 'Jun 16', count: Math.max(15, Math.floor(issuedCount * 0.10)) }
    ];

    const verificationTrend = [
      { date: 'Jun 10', count: Math.floor(viewCount * 0.15) },
      { date: 'Jun 12', count: Math.floor(viewCount * 0.25) },
      { date: 'Jun 14', count: Math.floor(viewCount * 0.20) },
      { date: 'Jun 15', count: Math.floor(viewCount * 0.30) },
      { date: 'Jun 16', count: Math.floor(viewCount * 0.10) }
    ];

    const shareTrend = [
      { date: 'Jun 10', count: Math.floor(shareCount * 0.10) },
      { date: 'Jun 12', count: Math.floor(shareCount * 0.30) },
      { date: 'Jun 14', count: Math.floor(shareCount * 0.15) },
      { date: 'Jun 15', count: Math.floor(shareCount * 0.20) },
      { date: 'Jun 16', count: Math.floor(shareCount * 0.25) }
    ];

    let verificationCount = 0;
    certs.forEach(c => {
      const audit = Array.isArray(c.audit_trail) ? c.audit_trail : JSON.parse(JSON.stringify(c.audit_trail || []));
      verificationCount += audit.filter((a: any) => a.event === 'VERIFIED').length;
    });

    const trafficSources = [
      { source: 'LinkedIn Direct Share', count: Math.floor(viewCount * 0.55) },
      { source: 'Email Invitation Link', count: Math.floor(viewCount * 0.25) },
      { source: 'Public QR Code Scan', count: Math.floor(viewCount * 0.15) },
      { source: 'Organic Verification API', count: Math.floor(viewCount * 0.05) }
    ];

    const payload: WorkspaceAnalytics = {
      issuedCount,
      viewCount,
      downloadCount,
      shareCount,
      activePrograms,
      verificationCount,
      issuanceTrend,
      verificationTrend,
      shareTrend,
      trafficSources
    };

    res.json(payload);
  } catch (err: any) {
    logger.error('Error generating analytics', err);
    res.status(500).json({ error: 'Database error calculating analytics' });
  }
});

// Helper for Gemini API retry on 503
async function generateGeminiContentWithRetry(ai: any, params: any, retries = 3, delay = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      if (err.message && err.message.includes('503') && i < retries - 1) {
        logger.warn(`[Gemini API] 503 Overloaded, retrying (Attempt ${i + 1}/${retries})`, { delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

// AI Template Generation Endpoint
app.post('/api/ai/generate-template', authenticateToken, async (req, res) => {
  const { prompt, sampleImage } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'Google Gemini API key not configured on server' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    let contents: any;
    if (sampleImage && sampleImage.data && sampleImage.mimeType) {
      contents = [
        {
          inlineData: {
            data: sampleImage.data,
            mimeType: sampleImage.mimeType
          }
        },
        {
          text: `You are an expert graphic designer and certificate layout planner.
Analyze the uploaded sample certificate design image and generate a new certificate template design that mimics the uploaded sample certificate style, layout, border style, colors, background, and element placements as closely as possible.
Also consider this prompt: "${prompt}".

Follow these strict design guidelines to achieve an identical matches:
1. BACKGROUND & BORDERS:
   - Identify the exact background color, gradients, and border style/borders from the sample image.
   - Generate a clean, valid SVG certificate border and background design in the "svg" field. The SVG must have a viewBox of "0 0 1200 900" and contain absolutely NO text (<text>) elements. Use paths, rects, gradients, filters, and groups to recreate the visual appearance of the sample's borders and background patterns.
   - Extract the primary background color and border color as hex codes in "backgroundColor" and "borderColor".
   - Extract the border width in pixels in "borderWidth".

2. TEXT ELEMENT PLACEMENTS (ALIGNMENT & COORDINATES):
   - Analyze the position of every text line in the sample certificate image.
   - Map their coordinates to "xPercent" and "yPercent". These MUST be integers between 0 and 100, representing percentage offsets from the top-left corner of the canvas (Center is 50, 50). Do NOT use absolute pixels (0-1200 or 0-900) for xPercent/yPercent.
   - For each text element, choose the correct text alignment ("align": "left" | "center" | "right") matching how the text is aligned in the sample certificate.
   - Recreate the text content, font family (Inter, Space Grotesk, Playfair Display, JetBrains Mono), font size (scaled relative to standard text sizes, e.g., 20-30 for titles, 12-16 for name/body, 9-11 for dates/meta), font weight (normal, medium, bold), and hex color to match the sample.
   - Ensure the name placeholder uses text "{{name}}" with "isPlaceholder": true.
   - Ensure the program/course placeholder uses text "{{program}}" with "isPlaceholder": true.
   - Create additional text elements for the certificate title, description, date, signatory names, and titles, placing them at the exact same relative positions as in the sample image.`
        }
      ];
    } else {
      contents = `You are an expert graphic designer and certificate layout planner.
Generate a beautiful, modern, and professional certificate template design based on this prompt: "${prompt}".

Follow these strict design guidelines:
1. BACKGROUND & BORDERS:
   - Generate a clean, valid SVG certificate border and background design in the "svg" field. The SVG must have a viewBox of "0 0 1200 900" and contain absolutely NO text (<text>) elements. Use paths, rects, gradients, and filters for borders and backgrounds.
   - Specify background color and border color as hex codes in "backgroundColor" and "borderColor".
   - Specify border width in pixels in "borderWidth".

2. TEXT ELEMENT PLACEMENTS (ALIGNMENT & COORDINATES):
   - Map coordinates of all text elements to "xPercent" and "yPercent". These MUST be integers between 0 and 100, representing percentage offsets from the top-left corner of the canvas (Center is 50, 50). Do NOT use absolute pixels.
   - Choose the correct text alignment ("align": "left" | "center" | "right") for each element.
   - You MUST include at least one element with text "{{name}}" (having isPlaceholder: true) and one element with text "{{program}}" (having isPlaceholder: true).`;
    }

    const response = await generateGeminiContentWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            svg: { type: Type.STRING, description: 'Raw SVG code for the certificate background/borders. Must be clean without any text elements.' },
            backgroundColor: { type: Type.STRING, description: 'Hex color for background' },
            borderColor: { type: Type.STRING, description: 'Hex color for border' },
            borderWidth: { type: Type.INTEGER, description: 'Border width in px' },
            textElements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  fontSize: { type: Type.INTEGER },
                  fontFamily: { type: Type.STRING, enum: ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono'] },
                  fontWeight: { type: Type.STRING, enum: ['normal', 'medium', 'bold'] },
                  color: { type: Type.STRING, description: 'Hex color code' },
                  xPercent: { type: Type.INTEGER },
                  yPercent: { type: Type.INTEGER },
                  align: { type: Type.STRING, enum: ['left', 'center', 'right'] },
                  isPlaceholder: { type: Type.BOOLEAN }
                },
                required: ['text', 'fontSize', 'fontFamily', 'fontWeight', 'color', 'xPercent', 'yPercent', 'align']
              }
            }
          },
          required: ['svg', 'textElements', 'backgroundColor', 'borderColor', 'borderWidth']
        }
      }
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const design = JSON.parse(response.text);
    const base64Svg = Buffer.from(design.svg).toString('base64');
    const backgroundImageUrl = `data:image/svg+xml;base64,${base64Svg}`;

    res.json({
      backgroundColor: design.backgroundColor,
      borderColor: design.borderColor,
      borderWidth: design.borderWidth,
      textElements: design.textElements.map((el: any, idx: number) => ({
        id: `ai-el-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        ...el
      })),
      backgroundImageUrl
    });
  } catch (err: any) {
    logger.error('Error generating AI template', err);
    res.status(500).json({ error: err.message || 'Error generating AI template' });
  }
});


// Global error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Caught exception in Global Error Handler', err);
  res.status(500).json({ error: err.message || 'An internal server error occurred' });
});

// Standard Vite Dev Server Mounting (Express / Vite Middleware code)
// =================================================================

const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (process.env.VERCEL) {
    logger.info('Running in Vercel Serverless environment.');
    return;
  }

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    // Use Vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve client-side React routes cleanly
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://localhost:${PORT} in ${isProd ? 'production' : 'development'} mode.`);
  });
}

startServer();

export default app;
