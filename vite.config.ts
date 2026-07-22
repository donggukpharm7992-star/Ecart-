import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const execFileAsync = promisify(execFile);
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const appStateRelativePath = path.join("app-state", "shared-state.json");
const appStatePath = path.join(rootDir, appStateRelativePath);
const pharmacyWorkbookRelativePath = path.join("약제팀 라벨", "원내보유의약품리스트.xlsx");
const pharmacyWorkbookPath = path.join(rootDir, pharmacyWorkbookRelativePath);

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readRequestBuffer(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function runGit(args: string[]) {
  return execFileAsync("git", args, { cwd: rootDir, windowsHide: true });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isGitLockError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("index.lock") || error.message.includes("Another git process seems to be running");
}

async function runGitWithRetry(args: string[], attempts = 6) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runGit(args);
    } catch (error) {
      lastError = error;
      if (!isGitLockError(error) || attempt === attempts) throw error;
      await wait(700 * attempt);
    }
  }
  throw lastError;
}

class StateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateConflictError";
  }
}

function stateSha(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function parseSavePayload(body: string) {
  const parsed = JSON.parse(body);
  if (parsed && typeof parsed === "object" && "envelope" in parsed) {
    return {
      envelope: parsed.envelope,
      baseSha: typeof parsed.baseSha === "string" ? parsed.baseSha : undefined,
      force: parsed.force === true,
    };
  }
  return { envelope: parsed, baseSha: undefined, force: false };
}

function countFilledNarcoticLots(envelope: unknown) {
  if (!envelope || typeof envelope !== "object" || !("state" in envelope)) return 0;
  const state = (envelope as { state?: { narcoticLotAssignments?: Record<string, { roomLot?: string; pharmacyLot?: string }> } }).state;
  return Object.values(state?.narcoticLotAssignments ?? {}).filter((value) => value?.roomLot || value?.pharmacyLot).length;
}

export function protectNarcoticLotAssignments<T extends { state?: Record<string, unknown> }>(incoming: T, current?: T): T {
  if (!current?.state || !incoming?.state) return incoming;
  if (current.state.narcoticLotFileName !== incoming.state.narcoticLotFileName) return incoming;
  if (countFilledNarcoticLots(current) <= countFilledNarcoticLots(incoming)) return incoming;
  return {
    ...incoming,
    state: {
      ...incoming.state,
      narcoticLotAssignments: current.state.narcoticLotAssignments,
      narcoticLotFileName: current.state.narcoticLotFileName,
    },
  };
}

async function saveStateAndPush(body: string) {
  const { envelope, baseSha, force } = parseSavePayload(body);
  let envelopeToSave = envelope;
  await fs.mkdir(path.dirname(appStatePath), { recursive: true });
  try {
    const current = await fs.readFile(appStatePath, "utf8");
    const currentSha = stateSha(current);
    if (!force && (!baseSha || baseSha !== currentSha)) {
      throw new StateConflictError("App state changed on the server. Reload the latest state before saving.");
    }
    envelopeToSave = protectNarcoticLotAssignments(envelope, JSON.parse(current));
  } catch (error) {
    if (!(typeof error === "object" && error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
  await fs.writeFile(appStatePath, `${JSON.stringify(envelopeToSave, null, 2)}\n`, "utf8");
  await runGitWithRetry(["add", "--", appStateRelativePath]);
  const status = await runGitWithRetry(["status", "--porcelain", "--", appStateRelativePath]);
  if (status.stdout.trim()) {
    await runGitWithRetry(["commit", "-m", "Sync app state", "--", appStateRelativePath]);
    await runGitWithRetry(["push", "origin", "main"]);
  }
  const saved = await fs.readFile(appStatePath, "utf8");
  return { sha: stateSha(saved) };
}

async function savePharmacyWorkbookAndPush(content: Buffer) {
  const temporaryPath = `${pharmacyWorkbookPath}.tmp-${Date.now()}`;
  await fs.writeFile(temporaryPath, content);
  await fs.rename(temporaryPath, pharmacyWorkbookPath);
  await runGitWithRetry(["add", "--", pharmacyWorkbookRelativePath]);
  const status = await runGitWithRetry(["status", "--porcelain", "--", pharmacyWorkbookRelativePath]);
  if (status.stdout.trim()) {
    await runGitWithRetry(["commit", "-m", "Sync pharmacy label workbook", "--", pharmacyWorkbookRelativePath]);
    await runGitWithRetry(["push", "origin", "main"]);
  }
  return { saved: true };
}

function appStateSyncPlugin(): Plugin {
  let writeQueue: Promise<void> = Promise.resolve();
  const apiPaths = new Set(["/api/app-state", "/Ecart-/api/app-state", "/api/pharmacy-label-workbook", "/Ecart-/api/pharmacy-label-workbook"]);

  return {
    name: "app-state-sync",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestPath = request.url?.split("?")[0] ?? "";
        if (!apiPaths.has(requestPath)) {
          next();
          return;
        }

        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Access-Control-Allow-Origin", request.headers.origin ?? "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
        response.setHeader("Vary", "Origin");

        try {
          if (request.method === "OPTIONS") {
            response.statusCode = 204;
            response.end();
            return;
          }

          if (request.method === "GET") {
            if (requestPath.endsWith("/pharmacy-label-workbook")) {
              try {
                const content = await fs.readFile(pharmacyWorkbookPath);
                response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                response.setHeader("Content-Length", content.byteLength);
                response.end(content);
              } catch (error) {
                if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
                  response.statusCode = 404;
                  response.end(JSON.stringify({ error: "Pharmacy workbook not found" }));
                  return;
                }
                throw error;
              }
              return;
            }
            try {
              const content = await fs.readFile(appStatePath, "utf8");
              response.end(JSON.stringify({ envelope: JSON.parse(content), sha: stateSha(content) }));
            } catch (error) {
              if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
                response.statusCode = 404;
                response.end(JSON.stringify({ error: "No app state saved yet" }));
                return;
              }
              throw error;
            }
            return;
          }

          if (request.method === "PUT") {
            const isPharmacyWorkbook = requestPath.endsWith("/pharmacy-label-workbook");
            const body = isPharmacyWorkbook ? await readRequestBuffer(request) : await readRequestBody(request);
            const resultPromise = writeQueue.then(async () => {
              if (isPharmacyWorkbook) return savePharmacyWorkbookAndPush(body as Buffer);
              return saveStateAndPush(body as string);
            });
            writeQueue = resultPromise.then(
              () => undefined,
              () => undefined,
            );
            const result = await resultPromise;
            response.end(JSON.stringify(result));
            return;
          }

          response.statusCode = 405;
          response.end(JSON.stringify({ error: "Method not allowed" }));
        } catch (error) {
          response.statusCode = 500;
          if (error instanceof StateConflictError) {
            response.statusCode = 409;
          }
          response.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "App state sync failed",
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), appStateSyncPlugin()],
  base: "/Ecart-/",
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
});
