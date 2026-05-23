import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/errors.js';

export const reportsRouter = Router();

reportsRouter.get('/summary', asyncHandler(async (req, res) => {
  const { domain } = req.query;
  if (!domain) throw new ApiError('domain param required', 400);
  // In production this would pull from DB; returning mock for now
  res.json({ success: true, data: { domain, generatedAt: new Date().toISOString(), note: 'Full report generation coming in v2' } });
}));
