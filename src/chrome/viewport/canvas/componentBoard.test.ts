/**
 * `features.componentBoard` — on by default so the standalone layout keeps the board; only
 * an explicit `false` (the dashboard) turns it off.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { resolveConfig } from "../../../config";
import { componentBoardEnabled } from "./componentBoard";

const callbacks = { onSave: async () => {}, onLoad: async () => null } as any;

test("componentBoardEnabled: only an explicit false turns the board off", () => {
  assert.equal(componentBoardEnabled(undefined), true);
  assert.equal(componentBoardEnabled(null), true);
  assert.equal(componentBoardEnabled({}), true);
  assert.equal(componentBoardEnabled({ componentBoard: true }), true);
  assert.equal(componentBoardEnabled({ componentBoard: false }), false);
});

test("resolveConfig: componentBoard defaults to true", () => {
  const { features } = resolveConfig({ callbacks } as any);
  assert.equal(features.componentBoard, true);
  assert.equal(componentBoardEnabled(features), true);
});

test("resolveConfig: a host's componentBoard: false survives the defaults", () => {
  const { features } = resolveConfig({ callbacks, features: { componentBoard: false } } as any);
  assert.equal(features.componentBoard, false);
  assert.equal(componentBoardEnabled(features), false);
});
