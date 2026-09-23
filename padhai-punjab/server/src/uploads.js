import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { bad } from './util.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'];
const EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic',
  'image/heif': '.heif', 'application/pdf': '.pdf',
};

/**
 * All uploaded files go into a PRIVATE directory that is never served statically.
 * Documents are readable only through the admin-only /admin/files route; the one
 * exception is a tutor's profile photo, served by /files/photo/:tutorId.
 */
export function makeUploads(privateDir) {
  fs.mkdirSync(privateDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: privateDir,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + (EXT[file.mimetype] || '')),
  });
  const make = (types) => multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024, files: 4 },
    fileFilter: (_req, file, cb) => {
      if (!types.includes(file.mimetype)) {
        return cb(bad(types === IMAGE_TYPES
          ? 'Please upload a photo (JPG or PNG).'
          : 'Please upload a photo (JPG or PNG) or a PDF.', file.fieldname));
      }
      cb(null, true);
    },
  });
  return {
    images: make(IMAGE_TYPES),
    docs: make(DOC_TYPES),
    pathFor: (name) => {
      const safe = path.basename(String(name || ''));
      return path.join(privateDir, safe);
    },
    remove: (name) => {
      if (!name) return;
      fs.rm(path.join(privateDir, path.basename(name)), { force: true }, () => {});
    },
  };
}

export const fileOf = (req, field) => req.files?.[field]?.[0] || (req.file?.fieldname === field ? req.file : null);
