/**
 * API calls for media, HTML conversion, and saving to server.
 */

import { getPageHubApiBaseUrl } from "../../core/apiConfig";

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
