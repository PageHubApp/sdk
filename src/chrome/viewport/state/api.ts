/**
 * API calls for media, HTML conversion, and saving to server.
 *
 * Image uploads go through `utils/media/upload.ts` (`uploadImageToCdn`) — it
 * owns the signed-URL request, CDN POST, preprocess, and error typing. This
 * file only keeps the low-level helpers that don't have a unified replacement.
 */

import { getPageHubApiBaseUrl } from "../../../core/apiConfig";
import { sdkLog } from "../../../utils/logger";

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
    sdkLog.error(e);
  }
};

/**
 * Delete one file's stored bytes (`DELETE /api/files`). Bytes only: the
 * library entry is the media library store's job (`useMediaLibrary().remove`).
 * Resolves to the response body (`{ deleted, reason?, backupsUsingMedia? }`).
 */
export const DeleteMedia = async (mediaId: string, settings: { _id?: string } | null | undefined) => {
  try {
    const res = await fetch(`${getApiBase()}/api/files`, {
      method: "DELETE",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, _id: settings?._id }),
    });
    return res.json();
  } catch (e) {
    sdkLog.error(e);
    throw e;
  }
};
