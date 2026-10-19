import test from "node:test";
import assert from "node:assert/strict";
import { configureCdn } from "../../../../utils/cdn";
import {
  buildCroppedItem,
  canReplaceInPlace,
  cropFileName,
  cropOutputType,
  cropSourceUrl,
  cropTitle,
  hasTransparency,
  isPngSource,
} from "./cropSave";

configureCdn({ accountHash: "acct", baseUrl: "https://imagedelivery.net" });

const cdnItem = {
  id: "orig1",
  type: "cdn",
  order: 3,
  metadata: {
    title: "Beach.jpg",
    alt: "A beach at dusk",
    folderId: "f1",
    size: 900000,
    dimensions: { width: 2680, height: 1787, aspectRatio: 2680 / 1787 },
    aiPrompt: "x",
  },
};

test("cropSourceUrl: CDN asks for the scale-down original, not a preview or the named variant", () => {
  assert.equal(
    cropSourceUrl(cdnItem),
    "https://imagedelivery.net/acct/orig1/w=4096,fit=scale-down,quality=100"
  );
  // A replaced item crops what it shows now (cdnId), and a typeless item is CDN.
  assert.match(cropSourceUrl({ id: "a", cdnId: "b" })!, /\/acct\/b\//);
});

test("cropSourceUrl: url items use metadata.url; svg / r2 / unknown can't be cropped", () => {
  assert.equal(
    cropSourceUrl({ id: "u", type: "url", metadata: { url: "https://x.test/a.png" } }),
    "https://x.test/a.png"
  );
  assert.equal(cropSourceUrl({ id: "u", type: "url", metadata: {} }), null);
  assert.equal(cropSourceUrl({ id: "s", type: "svg", metadata: { svg: "<svg/>" } }), null);
  assert.equal(cropSourceUrl({ id: "r", type: "r2" }), null);
  assert.equal(cropSourceUrl({ id: "z", type: "weird" }), null);
  assert.equal(cropSourceUrl(null), null);
});

test("canReplaceInPlace: CDN only", () => {
  assert.equal(canReplaceInPlace(cdnItem), true);
  assert.equal(canReplaceInPlace({ id: "a" }), true);
  assert.equal(canReplaceInPlace({ id: "u", type: "url" }), false);
});

test("cropTitle / cropFileName", () => {
  assert.equal(cropTitle(cdnItem), "Beach.jpg (cropped)");
  assert.equal(cropTitle({ id: "abc", name: "Logo" }), "Logo (cropped)");
  assert.equal(cropTitle({ id: "abc" }), "abc (cropped)");
  assert.equal(cropFileName(cdnItem, "image/jpeg"), "Beach-cropped.jpg");
  assert.equal(
    cropFileName({ metadata: { title: "My hero / shot #2.png" } }, "image/png"),
    "My-hero-shot-2-cropped.png"
  );
  assert.equal(cropFileName({ metadata: { title: "///" } }, "image/jpeg"), "image-cropped.jpg");
});

test("output type: PNG for transparency or a PNG source, else JPEG", () => {
  assert.equal(cropOutputType({ sourceIsPng: false, transparent: false }), "image/jpeg");
  assert.equal(cropOutputType({ sourceIsPng: false, transparent: true }), "image/png");
  assert.equal(cropOutputType({ sourceIsPng: true, transparent: false }), "image/png");
  assert.equal(isPngSource({ metadata: { contentType: "image/png" } }), true);
  assert.equal(isPngSource({ metadata: { title: "logo.PNG" } }), true);
  assert.equal(isPngSource({ type: "url", metadata: { url: "https://x.test/a.png?v=2" } }), true);
  assert.equal(isPngSource(cdnItem), false);
  assert.equal(hasTransparency([1, 2, 3, 255, 4, 5, 6, 255]), false);
  assert.equal(hasTransparency([1, 2, 3, 255, 4, 5, 6, 254]), true);
});

const file = { size: 123456, type: "image/jpeg" };

test("buildCroppedItem copy: new id, own file, same folder, no junk", () => {
  const item = buildCroppedItem({
    media: cdnItem,
    mode: "copy",
    mediaId: "new1",
    width: 1600,
    height: 900,
    file,
    now: 42,
  });
  assert.deepEqual(item, {
    id: "new1",
    type: "cdn",
    uploadedAt: 42,
    metadata: {
      title: "Beach.jpg (cropped)",
      alt: "A beach at dusk",
      folderId: "f1",
      size: 123456,
      contentType: "image/jpeg",
      dimensions: { width: 1600, height: 900, aspectRatio: 1600 / 900 },
      isVariant: true,
    },
  });
  assert.equal("cdnId" in item, false);
});

test("buildCroppedItem copy from a url item becomes a CDN item", () => {
  const item = buildCroppedItem({
    media: { id: "u", type: "url", metadata: { url: "https://x.test/a.jpg", title: "Ext" } },
    mode: "copy",
    mediaId: "new2",
    width: 10,
    height: 20,
    file,
    now: 1,
  });
  assert.equal(item.type, "cdn");
  assert.equal(item.metadata.url, undefined);
  assert.equal(item.metadata.title, "Ext (cropped)");
});

test("buildCroppedItem replace: same id, cdnId = crop, metadata merged with new size", () => {
  const item = buildCroppedItem({
    media: { ...cdnItem, cdnId: "older" },
    mode: "replace",
    mediaId: "new3",
    width: 800,
    height: 800,
    file,
  });
  assert.equal(item.id, "orig1");
  assert.equal(item.cdnId, "new3");
  assert.equal(item.type, "cdn");
  assert.equal(item.order, 3);
  assert.equal(item.metadata.title, "Beach.jpg");
  assert.equal(item.metadata.alt, "A beach at dusk");
  assert.equal(item.metadata.folderId, "f1");
  assert.equal(item.metadata.size, 123456);
  assert.equal(item.metadata.contentType, "image/jpeg");
  assert.deepEqual(item.metadata.dimensions, { width: 800, height: 800, aspectRatio: 1 });
  assert.equal(item.metadata.isVariant, undefined);
  // Cleared (undefined = remove on a merging update), same as Media Manager Replace.
  for (const k of ["url", "svg", "deliveryURL"]) {
    assert.ok(k in item.metadata);
    assert.equal(item.metadata[k], undefined);
  }
});
