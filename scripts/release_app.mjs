import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deployDir = join(root, ".deploy");
const tokenPath = join(deployDir, "github-token");
const askpassPath = join(deployDir, "git-askpass.cmd");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: options.env ?? process.env,
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

function sourceGitAuthArgs(argsList) {
  return ["-c", "http.sslBackend=openssl", "-c", "credential.helper=", ...argsList];
}

function readDeployToken() {
  const envToken = process.env.GITHUB_TOKEN?.trim();
  if (envToken) return envToken;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, "utf8").trim();
  throw new Error("No deploy token found. Run npm run publish:login once, then run npm run release.");
}

function createAskpass() {
  mkdirSync(deployDir, { recursive: true });
  writeFileSync(
    askpassPath,
    '@echo off\r\nset "prompt=%~1"\r\nif /I "%prompt:~0,8%"=="Username" (\r\n  echo x-access-token\r\n) else (\r\n  powershell -NoProfile -Command "[Console]::Out.Write($env:GITHUB_TOKEN)"\r\n)\r\n',
  );
}

function sourceGitEnv() {
  createAskpass();
  return {
    ...process.env,
    GITHUB_TOKEN: readDeployToken(),
    GIT_ASKPASS: askpassPath,
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "never",
  };
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
  git(sourceGitAuthArgs(["push", remote, branch]), { env: sourceGitEnv() });
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
