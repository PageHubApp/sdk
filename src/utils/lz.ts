import lz from "lzutf8";

export function compressJsonToBase64Lz(input: unknown): string {
  const json = typeof input === "string" ? input : JSON.stringify(input);
  return lz.encodeBase64(lz.compress(json));
}

export function decompressBase64LzToString(input: string): string {
  if (typeof input !== "string" || !input) {
    throw new Error("Expected non-empty compressed string");
  }
  return lz.decompress(lz.decodeBase64(input));
}

export function decompressBase64LzToJson<T = any>(input: string): T {
  const raw = decompressBase64LzToString(input);
  return JSON.parse(raw) as T;
}

export function tryDecompressBase64LzToJson<T = any>(input: unknown): T | null {
  if (typeof input !== "string" || !input) return null;
  try {
    return decompressBase64LzToJson<T>(input);
  } catch {
    return null;
  }
}
