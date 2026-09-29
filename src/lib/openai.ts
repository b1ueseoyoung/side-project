import "server-only";

import OpenAI from "openai";

// Server-only: the API key must never reach the browser.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const DIAGNOSIS_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5";
