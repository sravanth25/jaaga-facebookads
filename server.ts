import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/apiRouter';
import { syncSheetLeads } from './server/sheetService';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API routes FIRST
  app.use('/api', apiRouter);

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meta Ads Dashboard server running on http://0.0.0.0:${PORT}`);
  });

  // Background Automatic Cron Job (Every 5 minutes)
  const CRON_INTERVAL_MS = 5 * 60 * 1000;
  console.log('[Auto-Cron] Initialized 5-minute background lead sync timer.');
  setInterval(async () => {
    if (process.env.LEADS_SHEET_PUBHTML_URL || process.env.LEADS_SHEET_CSV_URLS || process.env.LEADS_SHEET_CSV_URL) {
      try {
        console.log('[Auto-Cron] Running 5-minute Google Sheet lead sync...');
        const result = await syncSheetLeads();
        console.log(`[Auto-Cron] Sheet sync complete: ${result.imported} imported, ${result.skipped} skipped (Total: ${result.total})`);
      } catch (err: any) {
        console.error('[Auto-Cron] Error in background lead sync:', err.message || err);
      }
    }
  }, CRON_INTERVAL_MS);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
