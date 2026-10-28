import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import client from 'prom-client';
import { router } from './routes.js';
import { Vehicle } from './models.js';
import { config } from './config.js';
import { daysAgo } from './age.js';
import { logger } from './logger.js';

// ---- Metrics (Prometheus) ----
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});
new client.Gauge({
  name: 'inventory_aging_units',
  help: 'In-stock vehicles older than the aging threshold',
  async collect() {
    try {
      this.set(await Vehicle.countDocuments({ status: 'in_stock', date_received: { $lt: daysAgo(config.agingDays) } }));
    } catch {
      /* metric is best effort */
    }
  },
});

// Tenant scope. In production this comes from a verified token claim (OIDC/JWT), never a header.
const tenant = (req, _res, next) => {
  req.dealershipId = req.header('x-dealership-id') || 'dealership-1';
  next();
};

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '10kb' }));

  // One request id per call, returned to the client and attached to every log line.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => ['/healthz', '/readyz', '/metrics'].includes(req.url) },
    })
  );
  app.use((req, res, next) => {
    const end = httpDuration.startTimer();
    res.on('finish', () => end({ method: req.method, route: (req.baseUrl || '') + (req.route?.path || ''), status: res.statusCode }));
    next();
  });

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not ready' });
  });
  app.get('/metrics', async (_req, res) => {
    res.set('content-type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }), tenant, router);

  app.use((req, res) => res.status(404).json({ error: 'Not found', request_id: req.id }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) req.log.error({ err }, 'unhandled error');
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, request_id: req.id });
  });
  return app;
}
