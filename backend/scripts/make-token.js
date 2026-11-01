import { SignJWT } from "jose";
import { config } from "../src/config.js";

// Options: --role manager|viewer  --dealership dealership-1  --sub demo-manager  --expires 8h
const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : fallback;
};

if (!config.jwtSecret || config.jwtSecret.length < 32) {
  console.error(
    "Set JWT_SECRET (32+ characters) in backend/.env first. Generate one with: openssl rand -hex 32",
  );
  process.exit(1);
}

const jwt = new SignJWT({
  [config.dealershipClaim]: arg("dealership", "dealership-1"),
  [config.roleClaim]: arg("role", "manager"),
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(arg("sub", "demo-manager"))
  .setIssuedAt()
  .setExpirationTime(arg("expires", "8h"));
if (config.jwtIssuer) jwt.setIssuer(config.jwtIssuer);
if (config.jwtAudience) jwt.setAudience(config.jwtAudience);

console.log(await jwt.sign(new TextEncoder().encode(config.jwtSecret)));
