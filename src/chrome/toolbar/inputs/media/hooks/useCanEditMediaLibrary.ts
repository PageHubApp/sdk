import { useSDK } from "@/core/context";

/**
 * Whether the Media Manager may change the library beyond uploads — see
 * `PageHubFeatures.mediaLibraryEdit`. Off in the email editor.
 */
export function useCanEditMediaLibrary(): boolean {
  return useSDK().features.mediaLibraryEdit !== false;
}
