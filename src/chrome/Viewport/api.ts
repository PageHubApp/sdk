/**
 * API calls for media, HTML conversion, and saving to server.
 */

import lz from "lzutf8";
import { getPageHubApiBaseUrl } from "../../runtimeApi";

const getApiBase = () => getPageHubApiBaseUrl();

export const GetHtmlToComponent = async (html: string) => {
  try {
    const res = await fetch(`${getApiBase()}/api/convert`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ content: html }),
    });
    return res.json();
  } catch (e) {
    console.error(e);
  }
};

export const GetSignedUrl = async () => {
  try {
    const res = await fetch(`${getApiBase()}/api/media/get`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to get signed URL: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (e) {
    console.error("GetSignedUrl error:", e);
    throw e;
  }
};

export const SaveMedia = async (media: File, url: string) => {
  const formData = new FormData();
  formData.append("file", media);
  try {
    const res = await fetch(url, { method: "POST", body: formData });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (e) {
    console.error("SaveMedia error:", e);
    throw e;
  }
};

export const DeleteMedia = async (
  mediaId: string,
  settings: any,
  query: any = null,
  actions: any = null
) => {
  try {
    const res = await fetch(`${getApiBase()}/api/files`, {
      method: "DELETE",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, _id: settings._id }),
    });
    if (query && actions && mediaId) {
      const { unregisterMediaFromBackground } = await import("../../utils/lib");
      unregisterMediaFromBackground(query, actions, mediaId);
    }
    return res.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const SaveToServer = async (
  json: string,
  draft: boolean,
  settings: any,
  setSettings: any,
  sessionToken: string | null = null
) => {
  const content = lz.encodeBase64(lz.compress(json));
  localStorage.setItem("draft", content);

  const _id = settings?._id || "";
  const r: any = { _id };
  if (draft) r.draft = content;
  else r.content = content;
  if (sessionToken) r.sessionToken = sessionToken;

  const headers: any = { Accept: "application/json", "Content-Type": "application/json" };
  if (sessionToken) headers["x-pagehub-token"] = sessionToken;

  const res = await fetch(`${getApiBase()}/api/save`, {
    method: "POST",
    headers,
    body: JSON.stringify(r),
  });

  let result: any = null;
  try { result = await res.json(); } catch (e) { console.error(e); }

  if (!res.ok) {
    const msg = result?.error || `Save failed (${res.status})`;
    setSettings((prev: any) => ({ ...prev, error: msg, upgrade: result?.upgrade || false }));
    return;
  }

  if (result && result._id) {
    const lsIds = JSON.parse(localStorage.getItem("history") || "[]") || [];
    if (!lsIds.find((_: any) => _._id === result._id)) {
      lsIds.push({ _id: result._id, draftId: result?.title || result?.draftId });
      localStorage.setItem("history", JSON.stringify(lsIds));
    }
    if (result._id !== _id) {
      window.history.pushState(result._id, result._id, `/build/${result._id}`);
      localStorage.setItem("_id", result._id);
      setSettings(result);
    }
  }
};
