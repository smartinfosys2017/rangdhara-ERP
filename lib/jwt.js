import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET
);

/**
 * Create JWT token
 */
export async function createApiToken(payload = {}) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return await new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verify JWT token
 */
export async function verifyApiToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });

  return payload;
}