// Run `next dev` and open the app in the browser once the server is ready.
// Usage: npm run dev   (set BROWSER=none to skip opening)

import { spawn } from "node:child_process";

const child = spawn("next", ["dev", "-H", "127.0.0.1", ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "inherit"],
  env: { ...process.env, FORCE_COLOR: "1" },
});

let opened = process.env.BROWSER === "none";

child.stdout.on("data", (chunk: Buffer) => {
  process.stdout.write(chunk);
  if (opened) return;
  // Next prints "- Local: http://127.0.0.1:3000"; the port changes if 3000 is taken.
  const match = chunk.toString().replace(/\x1b\[[0-9;]*m/g, "").match(/Local:\s+(http\S+)/);
  if (match) {
    opened = true;
    spawn("open", [match[1]], { stdio: "ignore" });
  }
});

// Ctrl+C reaches `next dev` directly; exit together with it.
process.on("SIGINT", () => {});
child.on("exit", (code) => process.exit(code ?? 0));
