import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { isAllowedEmail, requireEnv } from "./env";
import { sendLoginLink } from "./mail";

// Two people use the deployed app. Login is by emailed link only, and only
// addresses in ALLOWED_EMAILS can receive a link or get an account.

function create() {
  return betterAuth({
    secret: requireEnv("BETTER_AUTH_SECRET"),
    baseURL: requireEnv("BETTER_AUTH_URL"),
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
    },
    telemetry: { enabled: false },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => isAllowedEmail(user.email),
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 10,
        storeToken: "hashed",
        rateLimit: { window: 60 * 10, max: 3 },
        sendMagicLink: async ({ email, url }) => {
          // Same response either way, so the form doesn't reveal who is allowed.
          if (!isAllowedEmail(email)) return;
          await sendLoginLink(email, url);
        },
      }),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof create> | undefined;

/** Created on first use so builds don't need the secrets. */
export function auth() {
  instance ??= create();
  return instance;
}
