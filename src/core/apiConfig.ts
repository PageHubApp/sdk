/**
 * SDK runtime values reachable from deep modules (e.g. Viewport `lib.tsx`) without `window` globals.
 * Set from {@link resolveConfig} and {@link PageHubProvider}; cleared on {@link PageHub.init} destroy.
 *
 * Note: A single module-level URL matches the previous `window.__pagehub_apiBaseUrl` contract.
 * Multiple concurrent editors on one page are not supported; the last mounted instance wins.
 */

let apiBaseUrl = "";

export function setPageHubApiBaseUrl(url: string | undefined | null): void {
  apiBaseUrl = typeof url === "string" ? url : "";
}

export function getPageHubApiBaseUrl(): string {
  return apiBaseUrl;
}
