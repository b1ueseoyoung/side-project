import "server-only";

// Read lazily so that `next build` works without secrets; the first request
// that needs a value fails loudly if it is missing.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * Local mode skips login on the owner's Mac, where the app listens on 127.0.0.1
 * only, so it must never be on in a deployment, whatever APP_MODE says.
 */
export function isLocalMode() {
  return process.env.APP_MODE === "local" && !process.env.VERCEL;
}

/** Lowercased allowlist from ALLOWED_EMAILS (comma separated). */
export function allowedEmails(): Set<string> {
  return new Set(
    requireEnv("ALLOWED_EMAILS")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedEmail(email: string) {
  return allowedEmails().has(email.trim().toLowerCase());
}

/** The owner's address: in local mode (no login) reports are saved under it. */
export function ownerEmail() {
  return requireEnv("OWNER_EMAIL").trim().toLowerCase();
}
