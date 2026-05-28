/**
 * Shared test fakes for the canvas right-click context menu surface
 * behavior tests. Split from canvas-context.behavior.test.ts (R3 — file
 * was 650 LOC). Mirrors topbar/navmenu test style: minimal browser +
 * Craft fakes, no jsdom.
 */
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { createMenusRegistry } from "../menus";
import { BUILTIN_COMMANDS } from "./commands";
import { BUILTIN_MENUS } from "./menus";
import { setEditorBackref } from "../editorBackref";

// ─── Browser fake ────────────────────────────────────────────────────────

export function installFakeBrowser() {
  const url = new URL("http://localhost/edit");
  const fakeWindow = {
    location: { search: "", pathname: "/edit", href: url.toString() },
    addEventListener: () => {},
    removeEventListener: () => {},
    history: {
      pushState(_s: unknown, _t: string, newUrl: string) {
        const parsed = new URL(newUrl, "http://localhost");
        fakeWindow.location.search = parsed.search;
        fakeWindow.location.pathname = parsed.pathname;
      },
      replaceState(_s: unknown, _t: string, newUrl: string) {
        const parsed = new URL(newUrl, "http://localhost");
        fakeWindow.location.search = parsed.search;
        fakeWindow.location.pathname = parsed.pathname;
      },
    },
    matchMedia: () => ({ matches: false }),
  };
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  };
  (globalThis as any).window = fakeWindow;
  (globalThis as any).document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
  };
  (globalThis as any).localStorage = localStorage;
  (globalThis as any).history = fakeWindow.history;
  return { fakeWindow, storage };
}

export function uninstallFakeBrowser() {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).localStorage;
  delete (globalThis as any).history;
}

// ─── Ecosystem fake ──────────────────────────────────────────────────────

export function installFakeEcosystem() {
  const atomState = new Map<unknown, unknown>();
  const ecosystem = {
    getInstance(template: any) {
      return {
        getState() {
          return atomState.get(template);
        },
        setState(value: any) {
          const current = atomState.get(template);
          const next = typeof value === "function" ? value(current) : value;
          atomState.set(template, next);
        },
      };
    },
  } as any;
  setEditorBackref({ ecosystem });
  return { ecosystem, atomState };
}

// ─── Craft fake ──────────────────────────────────────────────────────────

// Minimal Craft query / actions fake — enough to drive the right-click
// commands. Nodes are a flat map keyed by id; each carries `data.parent`,
// `data.props`, `data.custom`, `data.nodes[]`.
export interface FakeNode {
  id: string;
  data: {
    parent: string | null;
    isCanvas: boolean;
    props: any;
    custom: any;
    nodes: string[];
    displayName?: string;
    name?: string;
  };
  rules?: { canMoveIn?: (n: any[], p: any) => boolean };
}

export function buildFakeCraft(nodes: FakeNode[]) {
  const map = new Map(nodes.map(n => [n.id, n]));
  let selected: string | null = null;
  const events = {
    selected: {
      first: () => selected ?? undefined,
    },
  };
  const moves: Array<{ id: string; parent: string; index: number }> = [];
  const deletes: string[] = [];
  const propsSet: Array<{ id: string; mutator: any }> = [];
  const selects: string[] = [];
  const query = {
    node(id: string) {
      const n = map.get(id);
      return {
        get: () => n,
        isDeletable: () => !!n && n.data.props?.canDelete !== false,
        isDraggable: () => true,
      };
    },
    getEvent(name: string) {
      return name === "selected" ? events.selected : { first: () => undefined };
    },
    getOptions: () => ({ resolver: {} }),
    getSerializedNodes: () => ({}),
  } as any;
  const actions = {
    selectNode: (id: string | null) => {
      selected = id;
      selects.push(id ?? "<null>");
    },
    delete: (id: string) => {
      deletes.push(id);
    },
    move: (id: string, parent: string, index: number) => {
      moves.push({ id, parent, index });
      // Mutate parent.data.nodes to reflect the move (approximation).
      const p = map.get(parent);
      if (!p) return;
      // Remove from any current parent
      for (const candidate of map.values()) {
        const i = candidate.data.nodes.indexOf(id);
        if (i >= 0) candidate.data.nodes.splice(i, 1);
      }
      p.data.nodes.splice(index, 0, id);
    },
    setProp: (id: string, mutator: any) => {
      const n = map.get(id);
      if (n) mutator(n.data.props);
      propsSet.push({ id, mutator });
    },
  } as any;
  const setSelected = (id: string | null) => {
    selected = id;
  };
  return { query, actions, moves, deletes, propsSet, selects, setSelected };
}

// ─── Commands wiring ─────────────────────────────────────────────────────

export function setupCommands() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  const menus = createMenusRegistry({ commands, context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  for (const { location, items } of BUILTIN_MENUS) menus.contribute(location, items);
  return { context, commands, menus };
}
