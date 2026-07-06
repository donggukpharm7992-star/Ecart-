import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const indexPath = path.join(distDir, "index.html");
const routes = ["viewer", "pharmacy-viewer", "narcotic-viewer"];

await stat(indexPath);

for (const route of routes) {
  const routeDir = path.join(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await copyFile(indexPath, path.join(routeDir, "index.html"));
}
