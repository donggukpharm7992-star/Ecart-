import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    if (result.error) throw result.error;
    const details = options.capture ? `\n${result.stderr || result.stdout}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${details}`);
  }

  return result.stdout?.trim() ?? "";
}

function runNpm(args) {
  if (process.platform === "win32") {
    return run("cmd.exe", ["/d", "/s", "/c", ["npm.cmd", ...args].join(" ")]);
  }
  return run("npm", args);
}

function git(args, options = {}) {
  return run("git", args, options);
}

function currentBranch() {
  const branch = git(["branch", "--show-current"], { capture: true });
  if (!branch) throw new Error("Cannot release from a detached HEAD.");
  return branch;
}

function hasRemote(name) {
  return git(["remote"], { capture: true })
    .split(/\r?\n/)
    .includes(name);
}

function commitSourceChanges() {
  git(["add", "-A"]);
  const status = git(["status", "--porcelain"], { capture: true });
  if (!status) {
    console.log("No source changes to commit.");
    return;
  }

  const message = process.env.RELEASE_MESSAGE?.trim() || process.env.PUBLISH_MESSAGE?.trim() || "Release app update";
  git(["commit", "-m", message]);
}

function pushRemote(remote, branch) {
  if (!hasRemote(remote)) {
    throw new Error(`Missing required git remote: ${remote}`);
  }
  git(["push", remote, branch]);
}

function main() {
  const branch = currentBranch();
  runNpm(["test"]);
  runNpm(["run", "publish"]);
  commitSourceChanges();
  pushRemote("origin", branch);
  pushRemote("backup", branch);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
