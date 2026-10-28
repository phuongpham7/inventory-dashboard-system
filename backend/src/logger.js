import pino from 'pino';

// Structured JSON logs; secrets never reach the log line.
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
