import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const children = [];
const deployDir = path.join(process.cwd(), ".deploy");
const syncConfigFallbackPath = path.join(deployDir, "sync-config.json");
const fixedAppUrl = "https://donggukpharm7992-star.github.io/Ecart-/";
const repositoryUrl = "https://github.com/donggukpharm7992-star/Ecart-.git";
let publishedTunnelUrl = "";

function commandForPlatform(command, args) {
  return isWindows ? ["cmd.exe", ["/d", "/s", "/c", command, ...args]] : [command, args];
}

function spawnLogged(label, command, args) {
  const [platformCommand, platformArgs] = commandForPlatform(command, args);
  const child = spawn(platformCommand, platformArgs, {
    cwd: process.cwd(),
    shell: false,
    windowsHide: true,
  });
  children.push(child);

  const handleData = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text.replace(/^/gm, `[${label}] `));
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      const baseUrl = match[0].replace(/\/$/, "");
      console.log("");
      console.log("Public app URL:");
      console.log(`${baseUrl}/Ecart-/`);
      console.log("");
      publishFixedInstallSyncConfig(baseUrl);
      console.log("Keep this terminal open while using the app from another network.");
    }
  };

  child.stdout.on("data", handleData);
  child.stderr.on("data", handleData);
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });

  return child;
}

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function publishFixedInstallSyncConfig(tunnelBaseUrl) {
  if (publishedTunnelUrl === tunnelBaseUrl) return;

  const tempDir = mkdtempSync(path.join(tmpdir(), "ecart-sync-config-"));
  const apiBaseUrl = `${tunnelBaseUrl}/Ecart-/`;
  const config = {
    apiBaseUrl,
    updatedAt: new Date().toISOString(),
    source: "cloudflare-quick-tunnel",
  };
  const configText = `${JSON.stringify(config, null, 2)}\n`;
  mkdirSync(deployDir, { recursive: true });
  writeFileSync(syncConfigFallbackPath, configText, "utf8");

  try {
    runGit(["clone", "--depth", "1", "--branch", "gh-pages", repositoryUrl, tempDir], process.cwd());
    runGit(["config", "user.name", "Codex"], tempDir);
    runGit(["config", "user.email", "codex@openai.local"], tempDir);
    writeFileSync(path.join(tempDir, "sync-config.json"), configText, "utf8");
    runGit(["add", "--", "sync-config.json"], tempDir);
    const status = runGit(["status", "--porcelain", "--", "sync-config.json"], tempDir);
    if (status.trim()) {
      runGit(["commit", "-m", "Update fixed install sync server", "--", "sync-config.json"], tempDir);
      runGit(["push", "origin", "gh-pages"], tempDir);
    }
    publishedTunnelUrl = tunnelBaseUrl;
    console.log("");
    console.log("Fixed install URLs now sync through this tunnel:");
    console.log(fixedAppUrl);
    console.log(`${fixedAppUrl}viewer/`);
    console.log(`${fixedAppUrl}pharmacy-viewer/`);
    console.log("");
  } catch (error) {
    console.error("");
    console.error("Could not update fixed install sync config.");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});

spawnLogged("vite", npmCommand, ["run", "dev"]);
setTimeout(() => {
  spawnLogged("tunnel", npxCommand, ["cloudflared", "tunnel", "--url", "http://localhost:5173"]);
}, 1200);
