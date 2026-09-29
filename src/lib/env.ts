import "server-only";

// Read lazily so that `next build` works without secrets; the first request
// that needs a value fails loudly if it is missing.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * Local mode runs diagnoses with the owner's own Claude Code login, so it must
 * never be on in a deployment, whatever APP_MODE says.
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

/** The writer who runs diagnoses on their Mac; reports are saved under this address. */
export function ownerEmail() {
  return requireEnv("OWNER_EMAIL").trim().toLowerCase();
}
