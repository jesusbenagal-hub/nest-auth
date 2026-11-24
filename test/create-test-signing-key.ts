import {
  exportJWK,
  generateKeyPair,
  type JSONWebKeySet,
  type JWTPayload,
  SignJWT,
} from "jose";

/** The `iss` of the test tokens, as auth-service signs them. */
export const TEST_ISSUER = "hub-auth";

// Every test key has the same id: a token signed with another test key
// finds a key with its kid in the JWKS, and fails on the signature.
const TEST_KID = "test-key";

// A signed-in user without roles; each test adds what it needs.
const DEFAULT_CLAIMS = {
  email: "persona@example.com",
  name: "Persona",
  hub_admin: false,
  apps: {},
};

export interface TestTokenOptions {
  /** Merged over the default claims (`undefined` removes one). */
  claims?: JWTPayload;
  issuer?: string;
  /** As jose reads it: "10m", "1 minute ago"… */
  expiresAt?: string;
}

export interface TestSigningKey {
  /** The public half, as auth-service publishes it. */
  jwks: JSONWebKeySet;
  signToken: (options?: TestTokenOptions) => Promise<string>;
}

/**
 * A new ES256 key pair, as auth-service has: its JWKS for NestAuthModule and
 * a function that signs access tokens with it.
 */
export async function createTestSigningKey(): Promise<TestSigningKey> {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwks = {
    keys: [{ ...(await exportJWK(publicKey)), kid: TEST_KID, alg: "ES256" }],
  };

  function signToken({
    claims = {},
    issuer = TEST_ISSUER,
    expiresAt = "10m",
  }: TestTokenOptions = {}): Promise<string> {
    return new SignJWT({ ...DEFAULT_CLAIMS, ...claims })
      .setProtectedHeader({ alg: "ES256", kid: TEST_KID })
      .setIssuer(issuer)
      .setSubject("user-1")
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(privateKey);
  }

  return { jwks, signToken };
}
