/**
 * API calls for media, HTML conversion, and saving to server.
 *
 * Image uploads go through `utils/media/upload.ts` (`uploadImageToCdn`) — it
 * owns the signed-URL request, CDN POST, preprocess, and error typing. This
 * file only keeps the low-level helpers that don't have a unified replacement.
 */

import { getPageHubApiBaseUrl } from "../../../core/apiConfig";

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
      const { unregisterMediaFromBackground } = await import("../../../utils/media/media");
      unregisterMediaFromBackground(query, actions, mediaId);
    }
    return res.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
