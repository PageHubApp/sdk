const PREFIX = "ph-";

function k(key: string) {
  return key.startsWith(PREFIX) ? key : PREFIX + key;
}

export const phStorage = {
  /** Raw string read — drop-in for localStorage.getItem */
  get(key: string): string | null {
    try { return localStorage.getItem(k(key)); } catch { return null; }
  },

  /** Parsed JSON read with fallback */
  getJSON<T>(key: string, fallback: T | null = null): T | null {
    try {
      const raw = localStorage.getItem(k(key));
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  /** Write — strings stored as-is, everything else JSON-stringified */
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(k(key), typeof value === "string" ? value : JSON.stringify(value));
    } catch {}
  },

  remove(key: string): void {
    try { localStorage.removeItem(k(key)); } catch {}
  },
};
