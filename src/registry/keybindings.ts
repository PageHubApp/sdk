/**
 * Keybinding registry + key-event matcher.
 *
 * Phase 1 Wave A — registry only. The doc-level dispatcher is NOT mounted
 * here; that lands in Wave B. The matcher is exported as a pure function
 * so tests can drive it without DOM listeners.
 */
import type { CommandContext, KeybindingDef } from "./types";
import type { ContextRegistry } from "./context";
import { sdkLog } from "../utils/logger";
import { KeybindingRegistryError } from "../utils/errors";

export interface KeybindingsRegistry {
  register: <Args = unknown>(def: KeybindingDef<Args>) => void;
  unregister: (command: string, key?: string) => void;
  list: () => KeybindingDef[];
  /** Given a key event, returns the highest-priority matching binding (or null). */
  match: (event: KeyboardEvent, ctx?: CommandContext) => KeybindingDef | null;
  subscribe: (listener: () => void) => () => void;
}

export interface KeybindingsRegistryDeps {
  context: ContextRegistry;
}

// ─── Key parsing ────────────────────────────────────────────────────────────

const MODIFIER_TOKENS = new Set([
  "cmd",
  "meta",
  "ctrl",
  "control",
  "alt",
  "option",
  "opt",
  "shift",
  "mod",
]);

const KEY_ALIASES: Record<string, string> = {
  esc: "Escape",
  escape: "Escape",
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  space: " ",
  spacebar: " ",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  plus: "+",
  minus: "-",
};

export interface ParsedKey {
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** Either "mod" (cmd OR ctrl) was specified — match either. */
  mod: boolean;
  /** The "main" key — `event.key` value to match against (case-insensitive for letters). */
  key: string;
}

export function parseKey(spec: string): ParsedKey {
  if (!spec) {
    return { meta: false, ctrl: false, alt: false, shift: false, mod: false, key: "" };
  }
  const parts = spec
    .split("+")
    .map(p => p.trim())
    .filter(Boolean);
  const out: ParsedKey = {
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    mod: false,
    key: "",
  };
  for (const raw of parts) {
    const t = raw.toLowerCase();
    if (MODIFIER_TOKENS.has(t)) {
      if (t === "cmd" || t === "meta") out.meta = true;
      else if (t === "ctrl" || t === "control") out.ctrl = true;
      else if (t === "alt" || t === "option" || t === "opt") out.alt = true;
      else if (t === "shift") out.shift = true;
      else if (t === "mod") out.mod = true;
      continue;
    }
    // Final non-modifier token is the key.
    out.key = KEY_ALIASES[t] ?? raw;
  }
  return out;
}

function keyMatches(parsed: ParsedKey, event: KeyboardEvent): boolean {
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;
  if (parsed.mod) {
    if (!(event.metaKey || event.ctrlKey)) return false;
  } else {
    if (parsed.meta !== event.metaKey) return false;
    if (parsed.ctrl !== event.ctrlKey) return false;
  }
  const eventKey = event.key;
  if (!parsed.key) return false;
  // Compare case-insensitively for single-character / letter keys.
  if (parsed.key.length === 1 && eventKey.length === 1) {
    return parsed.key.toLowerCase() === eventKey.toLowerCase();
  }
  return parsed.key === eventKey;
}

export function createKeybindingsRegistry(
  deps: KeybindingsRegistryDeps
): KeybindingsRegistry {
  const list: KeybindingDef[] = [];
  const parsedCache = new WeakMap<KeybindingDef, ParsedKey>();
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        sdkLog.error("[ph.keybindings] listener error:", err);
      }
    });
  };

  const register = <Args = unknown>(def: KeybindingDef<Args>) => {
    if (!def?.command) {
      throw new KeybindingRegistryError({
        code: "KEYBINDINGS_NO_COMMAND",
        message: `[ph.keybindings] register requires command id`,
      });
    }
    if (!def.key) {
      throw new KeybindingRegistryError({
        code: "KEYBINDINGS_NO_KEY",
        message: `[ph.keybindings] register requires key`,
      });
    }
    const entry = def as KeybindingDef;
    list.push(entry);
    parsedCache.set(entry, parseKey(entry.key));
    notify();
  };

  const unregister = (command: string, key?: string) => {
    let mutated = false;
    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i]!;
      if (it.command !== command) continue;
      if (key && it.key !== key) continue;
      list.splice(i, 1);
      mutated = true;
    }
    if (mutated) notify();
  };

  const getParsed = (def: KeybindingDef): ParsedKey => {
    let p = parsedCache.get(def);
    if (!p) {
      p = parseKey(def.key);
      parsedCache.set(def, p);
    }
    return p;
  };

  const match = (event: KeyboardEvent, ctxOverride?: CommandContext): KeybindingDef | null => {
    const ctx = ctxOverride ?? deps.context.getSnapshot();
    let best: { def: KeybindingDef; priority: number; idx: number } | null = null;
    list.forEach((def, idx) => {
      const parsed = getParsed(def);
      if (!keyMatches(parsed, event)) return;
      if (def.when) {
        try {
          if (!def.when(ctx)) return;
        } catch (err) {
          sdkLog.error(`[ph.keybindings] when() threw for "${def.command}":`, err);
          return;
        }
      }
      const priority = def.priority ?? 0;
      if (!best || priority > best.priority || (priority === best.priority && idx > best.idx)) {
        best = { def, priority, idx };
      }
    });
    return best ? best.def : null;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { register, unregister, list: () => list.slice(), match, subscribe };
}
