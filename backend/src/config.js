import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/inventory",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  // The aging rule lives in one place and is configurable without a code change.
  agingDays: Number(process.env.AGING_DAYS) || 90,
};
