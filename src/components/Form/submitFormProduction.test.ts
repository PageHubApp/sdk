/**
 * React Form submit flow: a failed submission rolls back to the fields
 * instead of showing "loaded" (matches the static runtime's forms chunk).
 *
 * Run: pnpm exec tsx --test packages/sdk/src/components/Form/submitFormProduction.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { submitWithFormStates } from "./submitFormProduction";
import { formStateKeys } from "./formStateKeys";
import { registerSubmissionHandler } from "../../utils/submissions";
import { __resetForTests, getStateValue } from "../../utils/state/stateRegistry";

const g = globalThis as Record<string, unknown>;
// The success path reads window.gtag / fbq / dataLayer.
g.window ??= {};

const keys = formStateKeys("contact", "f1");
const states = () => [keys.fields, keys.loading, keys.loaded].map(k => getStateValue(k));
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

test("handler rejects → fields come back, loaded stays hidden", async () => {
  __resetForTests();
  registerSubmissionHandler(async () => {
    throw new Error("500");
  });
  await submitWithFormStates({ email: "a@b.co" }, { submissionType: "email" }, null, "f1", keys);
  assert.deepEqual(states(), ["shown", "hidden", "hidden"]);
});

test("custom endpoint answers non-2xx → fields come back", async () => {
  __resetForTests();
  const realFetch = g.fetch;
  g.fetch = async () => ({ ok: false, status: 502, json: async () => ({}) });
  try {
    await submitWithFormStates(
      { email: "a@b.co" },
      { submissionType: "custom", action: "https://example.com/hook", method: "POST" },
      null,
      "f1",
      keys
    );
  } finally {
    g.fetch = realFetch;
  }
  assert.deepEqual(states(), ["shown", "hidden", "hidden"]);
});

test("handler resolves → loading, then loaded", async () => {
  __resetForTests();
  registerSubmissionHandler(async () => ({ ok: true }));
  await submitWithFormStates({ email: "a@b.co" }, { submissionType: "email" }, null, "f1", keys);
  assert.deepEqual(states(), ["hidden", "shown", undefined]);
  await wait(1100);
  assert.deepEqual(states(), ["hidden", "hidden", "shown"]);
});
