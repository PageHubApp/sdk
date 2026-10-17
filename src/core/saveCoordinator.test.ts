import test from "node:test";
import assert from "node:assert/strict";
import { SaveCoordinator } from "./saveCoordinator";
import type { PageData, SaveMeta, SaveResponse } from "../types";

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => (resolve = r));
  return { promise, resolve };
}

/** Fake host: `content` is whatever the test sets; every send is recorded. */
function harness() {
  const state = { content: "v1", settled: 0 };
  const sends: { content: string; meta?: SaveMeta }[] = [];
  const pendingResponses: Deferred<SaveResponse>[] = [];
  const c = new SaveCoordinator();
  c.configure({
    buildPageData: async () => ({ content: state.content }) as PageData,
    onSave: (pageData, meta) => {
      sends.push({ content: pageData.content, meta });
      const d = deferred<SaveResponse>();
      pendingResponses.push(d);
      return d.promise;
    },
    onSaveSettled: () => {
      state.settled += 1;
    },
  });
  const respond = (i: number) =>
    pendingResponses[i].resolve({ ok: true, pageId: "site", updatedAt: `t${i}` });
  const tick = () => new Promise(r => setTimeout(r, 0));
  return { c, state, sends, respond, tick };
}

test("a save requested while one is in flight runs once more after it lands", async () => {
  const { c, state, sends, respond, tick } = harness();
  const first = c.save({ isDraft: true });
  await tick();
  assert.equal(sends.length, 1);

  state.content = "v2";
  c.markDirty();
  const second = c.save({ isDraft: true });
  const third = c.save({ isDraft: true });
  assert.equal(second, third, "callers during a flight share one follow-up");
  assert.equal(sends.length, 1, "nothing extra goes on the wire mid-flight");

  respond(0);
  await first;
  await tick();
  assert.equal(sends.length, 2, "follow-up started after the first landed");
  assert.equal(sends[1].content, "v2");
  respond(1);
  assert.equal((await second).updatedAt, "t1");
});

test("unsaved is cleared only when nothing changed during the flight", async () => {
  const { c, state, respond, tick } = harness();
  const p = c.save({ isDraft: true });
  await tick();
  state.content = "v2";
  c.markDirty(); // edit while the request is on the wire
  respond(0);
  await p;
  assert.equal(state.settled, 0, "payload did not include the edit");

  const q = c.save({ isDraft: true });
  await tick();
  respond(1);
  await q;
  assert.equal(state.settled, 1);
});

test("a draft save with unchanged content never hits the network", async () => {
  const { c, sends, respond, tick } = harness();
  const p = c.save({ isDraft: true });
  await tick();
  respond(0);
  const first = await p;

  c.markDirty(); // churn that serialises to the same tree
  const again = await c.save({ isDraft: true });
  assert.equal(sends.length, 1);
  assert.deepEqual(again, first);
});

test("a full save always goes up, even with unchanged content", async () => {
  const { c, sends, respond, tick } = harness();
  const p = c.save({ isDraft: true });
  await tick();
  respond(0);
  await p;

  const q = c.save({ isDraft: false });
  await tick();
  assert.equal(sends.length, 2);
  assert.equal(sends[1].meta?.isDraft, false);
  respond(1);
  await q;
});

test("a full save queued behind a draft outranks a queued draft", async () => {
  const { c, sends, respond, tick } = harness();
  const first = c.save({ isDraft: true });
  await tick();
  c.markDirty();
  c.save({ isDraft: true });
  const full = c.save({ isDraft: false });
  respond(0);
  await first;
  await tick();
  assert.equal(sends[1].meta?.isDraft, false);
  respond(1);
  await full;
});
