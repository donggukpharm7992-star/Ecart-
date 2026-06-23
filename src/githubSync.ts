export type GithubSyncConfig = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
};

export type RemoteStateEnvelope<T> = {
  version: 1;
  updatedAt: string;
  clientId: string;
  state: T;
};

export type RemoteStateResult<T> = {
  envelope: RemoteStateEnvelope<T>;
  sha: string;
};

export type RemoteSaveResult = {
  sha: string;
};

export function buildGithubContentsUrl(config: Pick<GithubSyncConfig, "owner" | "repo" | "branch" | "path">) {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(config.path)}?ref=${encodeURIComponent(
    config.branch,
  )}`;
}

export function encodeBase64Utf8(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }
  return btoa(binary);
}

export function decodeBase64Utf8(base64: string) {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

export function shouldApplyRemoteState({
  remoteUpdatedAt,
  localUpdatedAt,
  remoteClientId,
  clientId,
}: {
  remoteUpdatedAt: string;
  localUpdatedAt: string;
  remoteClientId: string;
  clientId: string;
}) {
  if (remoteClientId === clientId) return false;
  return Date.parse(remoteUpdatedAt) > Date.parse(localUpdatedAt || "1970-01-01T00:00:00.000Z");
}

function githubHeaders(config: GithubSyncConfig) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${config.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function loadRemoteState<T>(config: GithubSyncConfig): Promise<RemoteStateResult<T> | null> {
  const response = await fetch(buildGithubContentsUrl(config), {
    headers: githubHeaders(config),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub state load failed (${response.status})`);
  }

  const data = (await response.json()) as { content: string; sha: string };
  return {
    envelope: JSON.parse(decodeBase64Utf8(data.content)) as RemoteStateEnvelope<T>,
    sha: data.sha,
  };
}

export async function saveRemoteState<T>(
  config: GithubSyncConfig,
  envelope: RemoteStateEnvelope<T>,
  sha?: string,
): Promise<RemoteSaveResult> {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(config.path)}`, {
    method: "PUT",
    headers: {
      ...githubHeaders(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Sync inventory app state",
      branch: config.branch,
      content: encodeBase64Utf8(JSON.stringify(envelope, null, 2)),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub state save failed (${response.status})`);
  }

  const data = (await response.json()) as { content: { sha: string } };
  return { sha: data.content.sha };
}
