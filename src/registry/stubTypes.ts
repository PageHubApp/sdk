/**
 * Forward-declared registry interfaces, referenced by `PageHubInstance`.
 *
 * Kept structural (loose `any`) and dependency-free so `types/` can reference
 * the registries without importing the value-side `./registry` modules — that
 * would introduce a cycle. The concrete registry types live in
 * `registry/types.ts`; these are deliberately the loose public-instance shape.
 */

export interface PageHubCommandsRegistryStub {
  register: (def: any) => void;
  unregister: (id: string) => void;
  execute: (id: string, args?: any, options?: any) => Promise<void>;
  list: () => any[];
  get: (id: string) => any;
  isVisible: (id: string, args?: any) => boolean;
  isEnabled: (id: string, args?: any) => boolean;
  subscribe: (listener: () => void) => () => void;
}

export interface PageHubMenusRegistryStub {
  contribute: (location: string, items: any[]) => void;
  remove: (location: string, commandId: string) => void;
  items: (location: string, ctx?: any) => any[];
  raw: (location: string) => any[];
  subscribe: (listener: () => void) => () => void;
}

export interface PageHubSlotsRegistryStub {
  register: (def: any) => void;
  contribute: (c: any) => void;
  remove: (slotId: string, key?: any) => void;
  resolve: (slotId: string, ctx?: any) => any[];
  getDef: (slotId: string) => any;
  list: () => any[];
  subscribe: (listener: () => void) => () => void;
}

export interface PageHubKeybindingsRegistryStub {
  register: (def: any) => void;
  unregister: (command: string, key?: string) => void;
  list: () => any[];
  match: (event: KeyboardEvent, ctx?: any) => any;
  subscribe: (listener: () => void) => () => void;
}

export interface PageHubContextRegistryStub {
  setCommandContext: (patch: any) => void;
  set: (key: string, value: unknown) => void;
  unset: (key: string) => void;
  getSnapshot: () => any;
  subscribe: (listener: () => void) => () => void;
}
