/**
 * Copy the host library store's snapshot into `ROOT.props.pageMedia` /
 * `ROOT.props.mediaFolders`, so every editor reader of the tree (renderers,
 * pickers, `getMediaById`, the ROOT `Background`) sees the live library.
 *
 * - No-op without a registered store: the tree IS the library then.
 * - Never writes before the store's first snapshot (`data === undefined`), so
 *   the hydrated tree is never blanked by an empty array.
 * - Writes through `history.ignore()`: library changes aren't undoable steps.
 * - Re-applies after the tree is replaced (load / deserialize) and skips the
 *   write when the tree already holds the same library, so opening the editor
 *   doesn't dirty the save.
 *
 * Mounted once, by `<MediaLibraryMirror />` inside Craft's `<Editor>` in
 * `PageHubEditor`, which renders in every editor variant (with or without the
 * built-in top bar, sidebar or toolbar).
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { sdkLog } from "../logger";
import { getMediaLibraryStore, type MediaLibrarySnapshot } from "./libraryStore";

const NO_SNAPSHOT = { data: undefined as MediaLibrarySnapshot | undefined, error: undefined };
const useNoSnapshot = () => NO_SNAPSHOT;

const sameJson = (a: unknown, b: unknown) => {
  try {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  } catch {
    return false;
  }
};

interface MirrorState {
  data?: MediaLibrarySnapshot;
  media?: unknown;
  folders?: unknown;
}

/**
 * What the mirror should do for this render:
 *  - "skip": nothing changed since our last write;
 *  - "adopt": the tree already holds this library (e.g. the hydrated load) —
 *    remember it without writing, so the save isn't dirtied;
 *  - "write": copy the snapshot into ROOT.
 */
export function planMirror(
  data: MediaLibrarySnapshot,
  rootMedia: unknown,
  rootFolders: unknown,
  last: MirrorState
): "skip" | "adopt" | "write" {
  const treeIsOurs = rootMedia === last.media && rootFolders === last.folders;
  if (data === last.data && treeIsOurs) return "skip";
  if (sameJson(rootMedia, data.items) && sameJson(rootFolders, data.folders)) return "adopt";
  return "write";
}

export function useMirrorMediaLibraryToRoot(): void {
  const [store] = useState(getMediaLibraryStore);
  const useSnapshot = store ? store.useSnapshot : useNoSnapshot;
  const { data } = useSnapshot();

  const { actions, query, hasRoot, rootMedia, rootFolders } = useEditor(state => {
    const root = state.nodes[ROOT_NODE];
    return {
      hasRoot: !!root,
      rootMedia: root?.data?.props?.pageMedia,
      rootFolders: root?.data?.props?.mediaFolders,
    };
  });

  // What the tree held right after our last write, and which snapshot it came from.
  const last = useRef<MirrorState>({});

  useEffect(() => {
    if (!store || !data || !hasRoot) return;
    const plan = planMirror(data, rootMedia, rootFolders, last.current);
    if (plan === "skip") return;
    if (plan === "adopt") {
      last.current = { data, media: rootMedia, folders: rootFolders };
      return;
    }

    try {
      actions.history.ignore().setProp(ROOT_NODE, (p: Record<string, unknown>) => {
        p.pageMedia = data.items;
        p.mediaFolders = data.folders;
      });
      const props = query.node(ROOT_NODE).get()?.data?.props;
      last.current = { data, media: props?.pageMedia, folders: props?.mediaFolders };
    } catch (e) {
      sdkLog.error("Failed to mirror the media library into the page:", e);
    }
  }, [store, data, hasRoot, rootMedia, rootFolders, actions, query]);
}

/** Render-nothing mount point for {@link useMirrorMediaLibraryToRoot}. */
export function MediaLibraryMirror(): null {
  useMirrorMediaLibraryToRoot();
  return null;
}
