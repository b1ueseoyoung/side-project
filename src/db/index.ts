import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

let instance: ReturnType<typeof create> | undefined;

function create() {
  return drizzle(neon(requireEnv("DATABASE_URL")), { schema });
}

/** Created on first use so builds don't need DATABASE_URL. */
export function db() {
  instance ??= create();
  return instance;
}
