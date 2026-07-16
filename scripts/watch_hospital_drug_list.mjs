import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "약제팀 라벨", "원내보유의약품리스트.xlsx");
const generatedFiles = [
  join(root, "src", "data", "inventory.generated.json"),
  join(root, "src", "data", "narcoticInventory.generated.json"),
  join(root, "약제팀 라벨", "data", "hospitalDrugLabels.generated.json"),
];
const deployDir = join(root, ".deploy");
const statePath = join(deployDir, "hospital-drug-autosync-state.json");
const lockPath = join(deployDir, "hospital-drug-autosync.lock");
const logPath = join(deployDir, "hospital-drug-autosync.log");
const taskName = "HospitalInventoryDrugListAutoSync";
const pollMs = 5000;
const stablePollCount = 3;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  mkdirSync(deployDir, { recursive: true });
  writeFileSync(logPath, `${line}\n`, { encoding: "utf8", flag: "a" });
}

function fingerprint() {
  const stat = statSync(source);
  return `${stat.size}:${stat.mtimeMs}`;
}

function generatedDataIsCurrent() {
  if (!existsSync(source) || generatedFiles.some((path) => !existsSync(path))) return false;
  const sourceTime = statSync(source).mtimeMs;
  return generatedFiles.every((path) => statSync(path).mtimeMs >= sourceTime);
}

function readSavedFingerprint() {
  if (!existsSync(statePath)) return "";
  try {
    return JSON.parse(readFileSync(statePath, "utf8")).fingerprint ?? "";
  } catch {
    return "";
  }
}

function saveFingerprint(value) {
  mkdirSync(deployDir, { recursive: true });
  writeFileSync(statePath, `${JSON.stringify({ fingerprint: value, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}

function runNpm(args) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", ["npm.cmd", ...args].join(" ")] : args;
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: "utf8", stdio: "pipe" });
  if (result.stdout) log(result.stdout.trim());
  if (result.stderr) log(result.stderr.trim());
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(" ")} failed`);
}

function runPython(scriptPath) {
  const result = spawnSync(process.execPath, [join(root, "scripts", "run_python.mjs"), scriptPath], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout) log(result.stdout.trim());
  if (result.stderr) log(result.stderr.trim());
  if (result.status !== 0) throw new Error(`${scriptPath} failed`);
}

function syncAndRelease() {
  log("원내보유의약품리스트 변경을 반영합니다.");
  runPython("scripts/backup_hospital_drug_list.py");
  runNpm(["run", "generate:data"]);
  runNpm(["run", "generate:labels"]);
  runNpm(["run", "validate:data"]);
  runNpm(["run", "release"]);
  const current = fingerprint();
  saveFingerprint(current);
  log(`자동 배포가 완료되었습니다: ${current}`);
}

function acquireLock() {
  mkdirSync(deployDir, { recursive: true });
  try {
    const descriptor = openSync(lockPath, "wx");
    writeFileSync(descriptor, String(process.pid));
    closeSync(descriptor);
  } catch {
    throw new Error("원내보유의약품 자동 연동이 이미 실행 중입니다.");
  }
  const release = () => {
    try {
      unlinkSync(lockPath);
    } catch {}
  };
  process.on("exit", release);
  process.on("SIGINT", () => {
    release();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    release();
    process.exit(0);
  });
}

function install() {
  const nodePath = process.execPath;
  const scriptPath = fileURLToPath(import.meta.url);
  const taskCommand = `"${nodePath}" "${scriptPath}"`;
  const result = spawnSync(
    "schtasks.exe",
    ["/Create", "/F", "/SC", "ONLOGON", "/RL", "LIMITED", "/TN", taskName, "/TR", taskCommand],
    { encoding: "utf8", windowsHide: true },
  );
  let installMethod = "Windows 작업 스케줄러";
  if (result.status !== 0) {
    const startupDir = join(process.env.APPDATA ?? "", "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
    if (!process.env.APPDATA || !existsSync(startupDir)) {
      throw new Error(result.stderr || result.stdout || "자동 시작 작업 등록에 실패했습니다.");
    }
    const startupPath = join(startupDir, `${taskName}.cmd`);
    writeFileSync(startupPath, `@echo off\r\nchcp 65001 >nul\r\nstart "" /min "${nodePath}" "${scriptPath}"\r\n`, "utf8");
    installMethod = "Windows 사용자 시작프로그램";
  }
  spawn(nodePath, [scriptPath], { cwd: root, detached: true, stdio: "ignore", windowsHide: true }).unref();
  console.log(`자동 연동 작업을 등록하고 시작했습니다: ${taskName} (${installMethod})`);
}

if (process.argv.includes("--install")) {
  install();
  process.exit(0);
}

acquireLock();
if (!existsSync(source)) throw new Error(`원본 파일이 없습니다: ${source}`);

let saved = readSavedFingerprint();
if (!saved && generatedDataIsCurrent()) {
  saved = fingerprint();
  saveFingerprint(saved);
}

let observed = fingerprint();
let stableCount = 0;
let syncing = false;
log(`자동 연동 감시를 시작했습니다: ${source}`);

setInterval(() => {
  if (syncing || !existsSync(source)) return;
  const current = fingerprint();
  if (current !== observed) {
    observed = current;
    stableCount = 0;
    return;
  }
  if (current === saved) return;
  stableCount += 1;
  if (stableCount < stablePollCount) return;

  syncing = true;
  try {
    syncAndRelease();
    saved = fingerprint();
    observed = saved;
  } catch (error) {
    log(`자동 배포 실패: ${error instanceof Error ? error.message : error}`);
  } finally {
    stableCount = 0;
    syncing = false;
  }
}, pollMs);
