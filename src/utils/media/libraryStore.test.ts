import test from "node:test";
import assert from "node:assert/strict";
import {
  addLibraryItems,
  moveLibraryItems,
  patchLibraryItem,
  removeLibraryItems,
  reorderLibraryItems,
} from "../../chrome/toolbar/inputs/media/utils/libraryOps";
import {
  registerUploadedMedia,
  uploadedMediaItem,
} from "../../chrome/toolbar/inputs/media/utils/registerUpload";
import { describeRemoveResults } from "../../chrome/toolbar/inputs/media/hooks/useMediaDeleteState";
import { planMirror } from "./useMirrorMediaLibraryToRoot";
import { getMediaLibraryStore, registerMediaLibraryStore, type MediaLibraryStore } from "./libraryStore";
import type { MediaItem } from "./libraryTypes";

const a: MediaItem = { id: "a", type: "cdn", metadata: { title: "A", folderId: "f1" } };
const b: MediaItem = { id: "b", type: "url", metadata: { url: "https://x/b.png" } };

// ─── Tree store list ops ───

test("addLibraryItems appends new ids and replaces existing ones in place", () => {
  const next = addLibraryItems([a, b], [{ id: "a", type: "svg" }, { id: "c" }]);
  assert.deepEqual(
    next.map(m => [m.id, m.type]),
    [
      ["a", "svg"],
      ["b", "url"],
      ["c", undefined],
    ]
  );
  assert.equal(typeof next[2].uploadedAt, "number");
  assert.deepEqual(addLibraryItems(undefined, [b]).length, 1);
});

test("patchLibraryItem merges metadata, maps name to title, misses return null", () => {
  const r = patchLibraryItem([a, b], "a", { cdnId: "x", name: "Renamed", metadata: { alt: "alt" } });
  assert.ok(r);
  assert.equal(r.item.cdnId, "x");
  assert.deepEqual(r.item.metadata, { title: "Renamed", folderId: "f1", alt: "alt" });
  assert.equal(r.items[1], b);
  assert.equal(patchLibraryItem([a], "nope", {}), null);
});

test("patchLibraryItem clears a field when the patch sets it to undefined", () => {
  const svg: MediaItem = { id: "s", type: "svg", metadata: { svg: "<svg/>" } };
  const r = patchLibraryItem([svg], "s", { type: "cdn", metadata: { svg: undefined } });
  assert.equal(JSON.parse(JSON.stringify(r!.item)).metadata.svg, undefined);
});

test("reorder, move and remove", () => {
  assert.deepEqual(
    reorderLibraryItems([a, b], [{ id: "b", order: 0 }]).map(m => m.order),
    [undefined, 0]
  );
  const moved = moveLibraryItems([a, b], ["a", "b"], null);
  assert.equal(moved[0].metadata?.folderId, undefined);
  assert.equal(moveLibraryItems([b], ["b"], "f2")[0].metadata?.folderId, "f2");
  assert.deepEqual(removeLibraryItems([a, b], ["a"]), [b]);
});

// ─── Upload registration ───

const uploadResult = (over: Record<string, unknown> = {}) => ({
  mediaId: "m1",
  destination: "cf-images" as const,
  deliveryURL: "https://cdn/m1",
  file: new File(["x"], "photo.jpg", { type: "image/jpeg" }),
  width: 200,
  height: 100,
  ...over,
});

test("uploadedMediaItem builds cdn and r2 entries", () => {
  const img = uploadedMediaItem(uploadResult(), { source: "upload" });
  assert.equal(img.type, "cdn");
  assert.deepEqual(img.metadata?.dimensions, { width: 200, height: 100, aspectRatio: 2 });
  assert.equal(img.metadata?.alt, "photo");
  assert.equal(img.metadata?.source, "upload");

  const vid = uploadedMediaItem(
    uploadResult({
      destination: "r2",
      file: new File(["x"], "clip.mp4", { type: "video/mp4" }),
      width: undefined,
      height: undefined,
    })
  );
  assert.equal(vid.type, "r2");
  assert.equal(vid.metadata?.contentType, "video/mp4");
  assert.equal(vid.metadata?.deliveryURL, "https://cdn/m1");
  assert.equal(vid.metadata?.dimensions, undefined);
});

function fakeLibrary(has: boolean) {
  const calls: string[] = [];
  const lib = {
    refresh: async () => {
      calls.push("refresh");
    },
    update: async (id: string) => {
      calls.push(`update:${id}`);
      if (!has) throw new Error("missing");
      return { id };
    },
    add: async (items: MediaItem[]) => {
      calls.push(`add:${items.map(i => i.id).join(",")}`);
      return items;
    },
  };
  return { lib, calls };
}

test("registerUploadedMedia patches a row the host already registered", async () => {
  const { lib, calls } = fakeLibrary(true);
  await registerUploadedMedia(lib, uploadedMediaItem(uploadResult()));
  assert.deepEqual(calls, ["refresh", "update:m1"]);
});

test("registerUploadedMedia adds the entry when the store doesn't have it", async () => {
  const { lib, calls } = fakeLibrary(false);
  await registerUploadedMedia(lib, uploadedMediaItem(uploadResult()));
  assert.deepEqual(calls, ["refresh", "update:m1", "add:m1"]);
});

// ─── Delete notice ───

test("describeRemoveResults is quiet for plain deletes", () => {
  assert.equal(describeRemoveResults([{ id: "a", deleted: true }]), null);
});

test("describeRemoveResults explains kept files and backups", () => {
  const msg = describeRemoveResults([
    { id: "a", deleted: false, reason: "used-by-other-site", backupsUsingMedia: 2 },
  ]);
  assert.equal(
    msg,
    "Removed from this library. 1 file stays in storage because another site still uses it.\n" +
      "2 backups use this file. Restoring one of them won't bring it back."
  );
});

// ─── Editor mirror ───

test("planMirror writes a new snapshot, adopts an identical tree, skips its own write", () => {
  const snap = { items: [a], folders: [] };
  assert.equal(planMirror(snap, undefined, undefined, {}), "write");
  // Hydrated tree already equal to the rows: no write, no dirty save.
  assert.equal(planMirror(snap, [{ ...a }], [], {}), "adopt");
  const media = [a];
  const folders: never[] = [];
  assert.equal(planMirror(snap, media, folders, { data: snap, media, folders }), "skip");
  // The tree was replaced (load / deserialize) with stale data: write again.
  assert.equal(planMirror(snap, [b], folders, { data: snap, media, folders }), "write");
});

// ─── Registry ───

test("registerMediaLibraryStore sets and clears the host store", () => {
  const store = {} as MediaLibraryStore;
  assert.equal(getMediaLibraryStore(), null);
  registerMediaLibraryStore(store);
  assert.equal(getMediaLibraryStore(), store);
  registerMediaLibraryStore(null);
  assert.equal(getMediaLibraryStore(), null);
});
