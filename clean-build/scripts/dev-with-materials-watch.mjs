import { spawn } from "node:child_process";

const watcher = spawn(process.execPath, ["scripts/watch-materials-index.mjs"], {
  stdio: "inherit",
  env: process.env,
});

const next = spawn("next", ["dev"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

function shutdown(code = 0) {
  if (!watcher.killed) {
    watcher.kill("SIGTERM");
  }
  if (!next.killed) {
    next.kill("SIGTERM");
  }
  process.exit(code);
}

watcher.on("exit", (code) => {
  if (code && !next.killed) {
    next.kill("SIGTERM");
    process.exit(code);
  }
});

next.on("exit", (code) => {
  if (!watcher.killed) {
    watcher.kill("SIGTERM");
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
