import mongoose from "mongoose";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

await mongoose.connect(config.mongoUri, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
});
const server = createApp().listen(config.port, () =>
  logger.info({ port: config.port }, "api listening"),
);

// Graceful shutdown so in-flight requests finish during deploys.
const shutdown = (sig) => {
  logger.info({ sig }, "shutting down");
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
["SIGINT", "SIGTERM"].forEach((s) => process.on(s, () => shutdown(s)));
