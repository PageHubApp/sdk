import test from "node:test";
import assert from "node:assert/strict";
import { isDirectVideoFileUrl, isInlineDownloadUrl } from "./nativeVideo";

const ID = "65f43a85a1b2c3d4e5f60718";

test("a same-origin inline download plays as a native video", () => {
  assert.equal(isDirectVideoFileUrl(`/api/downloads/${ID}?inline=1`), true);
  assert.equal(isDirectVideoFileUrl(`/api/downloads/${ID}?x=2&inline=1`), true);
  assert.equal(isInlineDownloadUrl(`/api/downloads/${ID}?inline=1#t=30`), true);
});

test("attachment downloads, other origins and bad ids are not inline video", () => {
  assert.equal(isDirectVideoFileUrl(`/api/downloads/${ID}`), false);
  assert.equal(isDirectVideoFileUrl(`/api/downloads/${ID}?inline=10`), false);
  assert.equal(isDirectVideoFileUrl(`https://evil.test/api/downloads/${ID}?inline=1`), false);
  assert.equal(isDirectVideoFileUrl(`/api/downloads/not-an-id?inline=1`), false);
});

test("file extensions still work", () => {
  assert.equal(isDirectVideoFileUrl("https://cdn.test/a.mp4?x=1"), true);
  assert.equal(isDirectVideoFileUrl("https://youtube.com/watch?v=1"), false);
});
