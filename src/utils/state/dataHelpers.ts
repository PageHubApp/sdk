import { getStateValue, setState } from "./stateRegistry";

/**
 * Author-facing globals for custom JS handlers that produce data for a
 * `Data` repeater bound via `dataSource: { scope: "state:<key>" }`.
 *
 * `__phSetData(key, value)` JSON-encodes `value` (arrays, objects, primitives)
 * and writes it to the state registry. The repeater subscribes to the key and
 * re-renders when it changes.
 *
 * `__phGetData(key)` reads + JSON-parses the stored value (or returns `null`).
 *
 * Stored as JSON strings so the existing state registry (string values) stays
 * untouched. Callers don't need to stringify themselves.
 */
export function installPhDataHelpers(): void {
  if (typeof window === "undefined") return;
  const w = window as any;

  w.__phSetData = (key: string, value: unknown): void => {
    if (!key) return;
    let encoded: string;
    try {
      encoded = JSON.stringify(value ?? null);
    } catch {
      encoded = "null";
    }
    setState(key, { kind: "value", value: encoded, source: "runtime" }, "user-script");
  };

  w.__phGetData = (key: string): unknown => {
    if (!key) return null;
    const raw = getStateValue(key);
    if (raw == null || raw === "") return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
}
