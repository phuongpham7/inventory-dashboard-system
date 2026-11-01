import { jwtVerify, createRemoteJWKSet } from "jose";
import { config } from "./config.js";

// The dealership and role come ONLY from a verified token, never from a header or the request body.
//  - JWKS_URL set   -> tokens from your identity provider (RS256/ES256)
//  - JWT_SECRET set -> locally issued HS256 tokens (npm run token), for development
export function assertAuthConfig() {
  if (!config.jwksUrl && (!config.jwtSecret || config.jwtSecret.length < 32)) {
    throw new Error(
      "Authentication is not configured: set JWKS_URL, or JWT_SECRET with at least 32 characters",
    );
  }
}

let keyCache;
const verifyKey = () => {
  if (!keyCache)
    keyCache = config.jwksUrl
      ? createRemoteJWKSet(new URL(config.jwksUrl))
      : new TextEncoder().encode(config.jwtSecret);
  return keyCache;
};

const deny = (req, res, status, message) => {
  if (status === 401) res.set("WWW-Authenticate", "Bearer");
  return res.status(status).json({ error: message, request_id: req.id });
};

export async function authenticate(req, res, next) {
  const match = /^Bearer (.+)$/i.exec(req.header("authorization") || "");
  if (!match) return deny(req, res, 401, "Missing bearer token");
  try {
    const options = {
      algorithms: config.jwksUrl ? ["RS256", "ES256"] : ["HS256"],
    };
    if (config.jwtIssuer) options.issuer = config.jwtIssuer;
    if (config.jwtAudience) options.audience = config.jwtAudience;
    const { payload } = await jwtVerify(match[1], verifyKey(), options);

    const dealershipId = payload[config.dealershipClaim];
    if (typeof dealershipId !== "string" || !dealershipId)
      return deny(req, res, 403, "Token does not include a dealership");

    req.user = {
      id: String(payload.sub || "unknown"),
      role: String(payload[config.roleClaim] || "viewer"),
    };
    req.dealershipId = dealershipId;
    req.log = req.log.child({
      user_id: req.user.id,
      dealership_id: dealershipId,
    });
    return next();
  } catch (err) {
    req.log.warn({ reason: err.code || err.name }, "token rejected");
    return deny(req, res, 401, "Invalid or expired token");
  }
}

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : deny(req, res, 403, "Your role cannot perform this action");
