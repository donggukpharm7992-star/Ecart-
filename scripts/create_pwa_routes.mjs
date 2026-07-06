import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const indexPath = path.join(distDir, "index.html");
const appStatePath = path.resolve("app-state", "shared-state.json");
const routes = ["viewer", "pharmacy-viewer", "narcotic-viewer"];

await stat(indexPath);
await stat(appStatePath);

for (const route of routes) {
  const routeDir = path.join(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await copyFile(indexPath, path.join(routeDir, "index.html"));
}

const appStateDistDir = path.join(distDir, "app-state");
await mkdir(appStateDistDir, { recursive: true });
await copyFile(appStatePath, path.join(appStateDistDir, "shared-state.json"));
