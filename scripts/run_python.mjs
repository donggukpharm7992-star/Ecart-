import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scriptArgs = process.argv.slice(2);

if (scriptArgs.length === 0) {
  console.error("Usage: node scripts/run_python.mjs <script.py> [args...]");
  process.exit(1);
}

const localPython =
  process.platform === "win32" ? join(root, ".python", "python.exe") : join(root, ".python", "bin", "python");

const candidates = [
  process.env.PYTHON ? { command: process.env.PYTHON, args: [] } : null,
  existsSync(localPython) ? { command: localPython, args: [] } : null,
  process.platform === "win32" ? { command: "py", args: [] } : null,
  { command: "python", args: [] },
  { command: "python3", args: [] },
].filter(Boolean);

function isUsable(candidate) {
  const result = spawnSync(candidate.command, [...candidate.args, "-c", "import sys; print(sys.executable)"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0;
}

const python = candidates.find(isUsable);

if (!python) {
  console.error("No usable Python runtime found. Install Python in .python or set the PYTHON environment variable.");
  process.exit(1);
}

const result = spawnSync(python.command, [...python.args, ...scriptArgs], {
  cwd: root,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
