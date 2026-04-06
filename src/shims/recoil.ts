/**
 * SDK stubs for Zedux (formerly Recoil)
 * All atoms return default values, all hooks are no-ops
 */

// Re-export the Zedux-like API from our atoms file
export { atom, useSetAtomState } from "../utils/atoms";
export { useAtomState, useAtomValue, EcosystemProvider } from "@zedux/react";

// ion — just returns a stub atom-like object
export function ion(key: string, get: (opts: any) => any) {
  return { key, default: null, _sdk_atom: true };
}

// EcosystemProvider — pass-through (re-exported above, but also as standalone)
export const ZeduxRoot = ({ children }: any) => children;
