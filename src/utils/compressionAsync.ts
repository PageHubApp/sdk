/**
 * Async lz-utf8 compression/decompression via Web Worker.
 * Falls back to synchronous on the main thread if Workers are unavailable (SSR, old browsers).
 */

import lz from "lzutf8";

// ── Worker management ───────────────────────────────────────────────────────

let worker: Worker | null = null;
let idCounter = 0;
const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined" || typeof Blob === "undefined") return null;

  try {
    // Inline worker — avoids separate file bundling issues
    const code = `
      importScripts("https://cdn.jsdelivr.net/npm/lzutf8@0.6.3/build/production/lzutf8.min.js");
      self.onmessage = function(e) {
        var msg = e.data;
        try {
          var result;
          if (msg.type === "compress") {
            result = LZUTF8.encodeBase64(LZUTF8.compress(msg.data));
          } else {
            result = LZUTF8.decompress(LZUTF8.decodeBase64(msg.data));
          }
          self.postMessage({ id: msg.id, result: result });
        } catch (err) {
          self.postMessage({ id: msg.id, error: err.message || "Compression error" });
        }
      };
    `;
    const blob = new Blob([code], { type: "application/javascript" });
    worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = e => {
      const { id, result, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(result);
    };
    worker.onerror = () => {
      // Worker failed — kill it and fall back to sync
      worker?.terminate();
      worker = null;
      // Reject all pending
      for (const [id, p] of pending) {
        p.reject(new Error("Worker terminated"));
        pending.delete(id);
      }
    };
    return worker;
  } catch {
    return null;
  }
}

function postToWorker(type: "compress" | "decompress", data: string): Promise<string> {
  const w = getWorker();
  if (!w) {
    // Synchronous fallback
    if (type === "compress") {
      return Promise.resolve(lz.encodeBase64(lz.compress(data)));
    }
    return Promise.resolve(lz.decompress(lz.decodeBase64(data)));
  }

  const id = ++idCounter;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, type, data });
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Compress a JSON string to base64-encoded lz-utf8.
 * Uses Web Worker if available, synchronous fallback otherwise.
 */
export function compressAsync(json: string): Promise<string> {
  return postToWorker("compress", json);
}

/**
 * Decompress a base64-encoded lz-utf8 string back to the original string.
 * Uses Web Worker if available, synchronous fallback otherwise.
 */
export function decompressAsync(compressed: string): Promise<string> {
  return postToWorker("decompress", compressed);
}

/** Terminate the worker (cleanup on unmount). */
export function terminateCompressionWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
