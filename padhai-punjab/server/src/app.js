import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { makeAuth } from './auth.js';
import { openDb } from './db.js';
import { makeUploads } from './uploads.js';
import { ApiError } from './util.js';
import { publicRoutes } from './routes/public.js';
import { parentRoutes } from './routes/parent.js';
import { tutorRoutes } from './routes/tutor.js';
import { adminRoutes } from './routes/admin.js';

export function loadConfig(env = process.env) {
  const devMode = env.NODE_ENV !== 'production';
  const dataDir = env.DATA_DIR || path.resolve('data');
  if (!devMode && !env.AUTH_SECRET) throw new Error('AUTH_SECRET must be set in production.');
  return {
    devMode,
    port: Number(env.PORT || 4000),
    dataDir,
    dbFile: env.DB_FILE || path.join(dataDir, 'padhai.db'),
    privateDir: env.PRIVATE_DIR || path.join(dataDir, 'private'),
    secret: env.AUTH_SECRET || 'dev-only-secret-change-me',
    adminPhones: (env.ADMIN_PHONES || '9876500000').split(',').map((s) => s.trim()).filter(Boolean),
    fixedOtp: devMode ? env.DEV_FIXED_OTP || null : null,
    smsWebhookUrl: env.SMS_WEBHOOK_URL || null,
    smsWebhookToken: env.SMS_WEBHOOK_TOKEN || null,
    safetyWebhookUrl: env.SAFETY_WEBHOOK_URL || null,
    quiet: env.QUIET === '1',
  };
}

export function createApp(config, db = openDb(config.dbFile)) {
  const app = express();
  const auth = makeAuth(db, config);
  const uploads = makeUploads(config.privateDir);
  const ctx = { db, auth, uploads, config };

  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'authorization, content-type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    next();
  });
  app.options(/.*/, (_req, res) => res.sendStatus(204));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/', publicRoutes(ctx));
  app.use('/parent', parentRoutes(ctx));
  app.use('/tutor', tutorRoutes(ctx));
  app.use('/admin', adminRoutes(ctx));

  app.use((_req, _res, next) => next(new ApiError(404, 'Not found.')));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too big. Please upload a file under 8 MB.' : 'Upload failed. Please try again.';
      return res.status(400).json({ error: msg, field: err.field });
    }
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message, field: err.field });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
    const id = crypto.randomBytes(4).toString('hex');
    console.error(`[error ${id}]`, err);
    res.status(500).json({ error: `Something went wrong on our side. Please try again. (ref ${id})` });
  });

  return { app, db, auth };
}
