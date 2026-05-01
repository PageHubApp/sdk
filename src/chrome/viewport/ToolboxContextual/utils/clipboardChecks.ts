import { phStorage } from "../../../../utils/phStorage";

export const CANVAS_CLASS_CLIPBOARD = "canvas-class-clipboard";

export function hasCraftClipboardPaste(): boolean {
  const raw = phStorage.get("clipboard");
  if (!raw || raw === "{}") return false;
  try {
    const o = JSON.parse(raw) as { nodes?: string; rootNodeId?: string };
    return Boolean(o?.nodes && o?.rootNodeId && o.nodes !== "{}");
  } catch {
    return false;
  }
}

export function readClassClipboard(): { className: string; activeModifiers: string[] } | null {
  return phStorage.getJSON(CANVAS_CLASS_CLIPBOARD, null);
}
