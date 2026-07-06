import { spawnSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import process from "node:process";

const clientId = "178c6fc778ccc68e1d6a";
const scope = "repo workflow";
const statePath = ".tmp-gh-cli/device-auth.json";

function requestForm(url, form) {
  const body = new URLSearchParams(form).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "Codex",
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const mode = process.argv[2] ?? "push";

  if (mode === "start") {
    const device = await requestForm("https://github.com/login/device/code", {
      client_id: clientId,
      scope,
    });

    if (device.error) {
      throw new Error(`${device.error}: ${device.error_description ?? ""}`);
    }

    fs.writeFileSync(statePath, JSON.stringify({ ...device, created_at: Date.now() }, null, 2));
    console.log(`DEVICE_URL=${device.verification_uri}`);
    console.log(`DEVICE_CODE=${device.user_code}`);
    console.log("STATUS=saved_device_code");
    return;
  }

  if (mode === "push") {
    const device = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const auth = await requestForm("https://github.com/login/oauth/access_token", {
      client_id: clientId,
      device_code: device.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    if (auth.error) {
      throw new Error(`${auth.error}: ${auth.error_description ?? ""}`);
    }

    console.log("STATUS=authorized");
    const askpassPath = path.resolve(".tmp-gh-cli/git-askpass.cmd");
    fs.writeFileSync(
      askpassPath,
      [
        "@echo off",
        "echo %1 | findstr /I Username >nul",
        "if %errorlevel%==0 (",
        "  echo x-access-token",
        ") else (",
        "  echo %GITHUB_DEVICE_TOKEN%",
        ")",
        "",
      ].join("\r\n"),
    );
    const push = spawnSync(
      "git",
      [
        "-c",
        "safe.directory=H:/업무 앱/비품관리/dist",
        "-c",
        "http.sslBackend=openssl",
        "-c",
        "credential.helper=",
        "-C",
        "dist",
        "push",
        "origin",
        "gh-pages",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_ASKPASS: askpassPath,
          GIT_TERMINAL_PROMPT: "0",
          GITHUB_DEVICE_TOKEN: auth.access_token,
        },
      },
    );
    process.stdout.write(push.stdout);
    process.stderr.write(push.stderr);
    if (push.status !== 0) {
      throw new Error(`git push failed with exit code ${push.status}`);
    }
    console.log("STATUS=pushed");
    return;
  }

  const device = await requestForm("https://github.com/login/device/code", {
    client_id: clientId,
    scope,
  });

  if (device.error) {
    throw new Error(`${device.error}: ${device.error_description ?? ""}`);
  }

  console.log(`DEVICE_URL=${device.verification_uri}`);
  console.log(`DEVICE_CODE=${device.user_code}`);
  console.log("STATUS=waiting_for_github_authorization");

  let intervalSeconds = Number(device.interval ?? 5);
  const deadline = Date.now() + Number(device.expires_in ?? 900) * 1000;

  while (Date.now() < deadline) {
    await sleep(intervalSeconds * 1000);
    const auth = await requestForm("https://github.com/login/oauth/access_token", {
      client_id: clientId,
      device_code: device.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    if (auth.access_token) {
      console.log("STATUS=authorized");
      const push = spawnSync(
        "git",
        [
          "-c",
          "safe.directory=H:/업무 앱/비품관리/dist",
          "-c",
          "http.sslBackend=openssl",
          "-c",
          "credential.helper=",
          "-c",
          `http.https://github.com/.extraheader=AUTHORIZATION: bearer ${auth.access_token}`,
          "-C",
          "dist",
          "push",
          "origin",
          "gh-pages",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      process.stdout.write(push.stdout);
      process.stderr.write(push.stderr);
      if (push.status !== 0) {
        throw new Error(`git push failed with exit code ${push.status}`);
      }
      console.log("STATUS=pushed");
      return;
    }

    if (auth.error === "authorization_pending") {
      continue;
    }

    if (auth.error === "slow_down") {
      intervalSeconds += 5;
      continue;
    }

    throw new Error(`${auth.error}: ${auth.error_description ?? ""}`);
  }

  throw new Error("GitHub device authorization expired.");
}

main().catch((error) => {
  console.error(`STATUS=failed`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
