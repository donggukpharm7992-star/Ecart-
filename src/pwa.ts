export function buildPwaAssetUrl(baseUrl: string, assetPath: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedAsset = assetPath.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedAsset}`;
}

export type PwaMetadata = {
  manifestPath: string;
  iconPath: string;
  appleTitle: string;
  themeColor: string;
};

export function getPwaMetadata(pathname = "/"): PwaMetadata {
  const normalizedPath = pathname.replace(/\/+$/, "");
  const isNarcoticViewer = normalizedPath.endsWith("/narcotic-viewer");
  if (isNarcoticViewer) {
    return {
      manifestPath: "narcotic-viewer.webmanifest",
      iconPath: "icons/narcotic-icon-192.png",
      appleTitle: "비치마약류관리",
      themeColor: "#b91c1c",
    };
  }

  const isPharmacyViewer = normalizedPath.endsWith("/pharmacy-viewer");
  if (isPharmacyViewer) {
    return {
      manifestPath: "pharmacy-viewer.webmanifest",
      iconPath: "icons/app-icon-192.png",
      appleTitle: "약제팀 라벨",
      themeColor: "#f97316",
    };
  }

  const isViewer = normalizedPath.endsWith("/viewer");
  if (isViewer) {
    return {
      manifestPath: "viewer.webmanifest",
      iconPath: "icons/app-icon-192.png",
      appleTitle: "비품약 마스터 관리",
      themeColor: "#f97316",
    };
  }

  return {
    manifestPath: "manifest.webmanifest",
    iconPath: "icons/app-icon-192.png",
    appleTitle: "비품점검",
    themeColor: "#f97316",
  };
}

function setLinkHref(selector: string, href: string) {
  const element = document.querySelector<HTMLLinkElement>(selector);
  if (element) element.href = href;
}

function setMetaContent(selector: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (element) element.content = content;
}

export function applyPwaMetadata() {
  if (typeof window === "undefined") return;
  const version = "20260701a";
  const metadata = getPwaMetadata(window.location.pathname);
  const manifestHref = buildPwaAssetUrl(import.meta.env.BASE_URL, `${metadata.manifestPath}?v=${version}`);
  const iconHref = buildPwaAssetUrl(import.meta.env.BASE_URL, `${metadata.iconPath}?v=${version}`);

  setMetaContent('meta[name="theme-color"]', metadata.themeColor);
  setMetaContent('meta[name="apple-mobile-web-app-title"]', metadata.appleTitle);
  setLinkHref('link[rel="manifest"]', manifestHref);
  setLinkHref('link[rel="icon"]', iconHref);
  setLinkHref('link[rel="apple-touch-icon"]', iconHref);
}

export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const serviceWorkerUrl = buildPwaAssetUrl(import.meta.env.BASE_URL, "sw.js");
    void navigator.serviceWorker.register(serviceWorkerUrl).catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
