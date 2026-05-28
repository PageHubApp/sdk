/**
 * Builtin command catalog.
 *
 * Phase 1 Wave A landed every command as a stub. Phase 2 filled real `run`
 * bodies surface by surface; Phase 3 finished — every command has a real
 * `run` body and the dispatcher always `preventDefault()`s a matched chord
 * (no surviving inline Escape / chord listeners outside the dispatcher own
 * anything in the registry catalog).
 *
 * The catalog is split into per-namespace files (editor / canvas / node /
 * text / ai / site-tools / overlay / component) to keep each file under
 * the R3 600-LOC cap. Shared predicates and tiny cross-namespace run
 * helpers live in `./helpers`.
 */
import type { CommandDef } from "../../types";
import { EDITOR_COMMANDS } from "./editor";
import { CANVAS_COMMANDS } from "./canvas";
import { SITE_TOOLS_COMMANDS } from "./site-tools";
import { AI_COMMANDS } from "./ai";
import { NODE_COMMANDS } from "./node";
import { TEXT_COMMANDS } from "./text";
import { OVERLAY_COMMANDS } from "./overlay";
import { COMPONENT_COMMANDS } from "./component";

const _BUILTIN_COMMANDS_RAW: CommandDef[] = [
  ...EDITOR_COMMANDS,
  ...CANVAS_COMMANDS,
  ...SITE_TOOLS_COMMANDS,
  ...AI_COMMANDS,
  ...NODE_COMMANDS,
  ...TEXT_COMMANDS,
  ...OVERLAY_COMMANDS,
  ...COMPONENT_COMMANDS,
];

/**
 * Phase 2 marks commands as `stub: false` once their surface has migrated.
 * The dispatcher reads `stub` to decide whether to `preventDefault`/
 * `stopPropagation` on the matched chord: migrated commands take ownership;
 * unmigrated ones leave the chord to whatever inline handler still exists.
 *
 * Phase 3 finished — every command has a real `run` body. Keep the set so
 * a regression that ships a new stub is obvious.
 */
const STILL_STUB_IDS = new Set<string>([]);

export const BUILTIN_COMMANDS: CommandDef[] = _BUILTIN_COMMANDS_RAW.map(def => ({
  ...def,
  stub: STILL_STUB_IDS.has(def.id),
}));
