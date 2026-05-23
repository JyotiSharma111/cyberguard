import { Router } from 'express';
import { scanEmail } from '../lib/emailScanner.js';
import { validateDomain } from '../lib/dnsScanner.js';
import { asyncHandler, ApiError } from '../middleware/errors.js';

export const emailRouter = Router();

emailRouter.get('/scan', asyncHandler(async (req, res) => {
  const { domain } = req.query;
  if (!domain) throw new ApiError('Query param "domain" is required', 400);

  let cleaned;
  try { cleaned = validateDomain(domain); }
  catch (err) { throw new ApiError(err.message, 400); }

  const result = await scanEmail(cleaned);
  res.json({ success: true, data: result });
}));
