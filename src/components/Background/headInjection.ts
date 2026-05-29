import { sdkLog } from "../../utils/logger";
/**
 * Utilities for injecting header/footer elements into the document head.
 * Extracted from Background.tsx.
 */

const VALID_SCRIPT_TYPES = ["link", "meta", "title", "style", "script"];

/** Returns true when a `<script>` element should be treated as executable JS. */
function isExecutableJavaScriptScript(node: Element): boolean {
  const raw = node.getAttribute("type");
  if (raw == null || raw.trim() === "") return true;
  const t = raw.trim().toLowerCase();
  if (t === "module") return true;
  return (
    t === "text/javascript" ||
    t === "application/javascript" ||
    t === "text/ecmascript" ||
    t === "application/ecmascript"
  );
}

function copyElementAttributes(from: Element, to: Element) {
  for (let a = 0; a < from.attributes.length; a++) {
    const attr = from.attributes[a];
    to.setAttribute(attr.name, attr.value);
  }
}

/**
 * Parses an HTML string and appends valid `<link>`, `<meta>`, `<style>`, and
 * `<script>` elements to the given `parent` node. Returns the created elements
 * so the caller can clean them up later.
 */
export function addElementsToHead(
  header: string | undefined,
  parent: HTMLElement,
  isCssValid: (css: string) => boolean,
  isJsValid: (js: string) => boolean
): HTMLElement[] {
  const elements: HTMLElement[] = [];
  if (!header || typeof window === "undefined") return elements;

  const parser = new DOMParser();
  const doc = parser.parseFromString(header, "text/html");
  const headElement = doc.head;

  for (let i = 0; i < headElement.childNodes?.length; i++) {
    const node = headElement.childNodes[i] as Element;
    const nodeName = node.nodeName.toLowerCase();

    if (!VALID_SCRIPT_TYPES.includes(nodeName)) continue;

    if (nodeName === "style") {
      const styleContent = (node.textContent ?? "").trim();
      if (!isCssValid(styleContent)) {
        sdkLog.warn(`Ignoring invalid ${nodeName} element: ${node.textContent}`);
        continue;
      }
      const style = document.createElement("style");
      style.textContent = styleContent;
      elements.push(style);
      try {
        parent.appendChild(style);
      } catch (e: any) {
        sdkLog.warn(`Failed to append ${nodeName} element: ${e?.message}`);
      }
      continue;
    }

    if (nodeName === "script") {
      if (node.hasAttribute("src")) {
        const script = document.createElement("script");
        copyElementAttributes(node, script);
        if (!script.hasAttribute("async") && !script.hasAttribute("defer")) {
          script.setAttribute("async", "");
        }
        elements.push(script);
        try {
          parent.appendChild(script);
        } catch (e: any) {
          sdkLog.warn(`Failed to load script src ${script.getAttribute("src")}: ${e?.message}`);
        }
      } else {
        const scriptContent = (node.textContent ?? "").trim();
        const script = document.createElement("script");

        if (isExecutableJavaScriptScript(node)) {
          const t = (node.getAttribute("type") || "").trim().toLowerCase();
          if (t !== "module" && !isJsValid(scriptContent)) {
            sdkLog.warn(`Ignoring invalid ${nodeName} element: ${node.textContent}`);
            continue;
          }
          copyElementAttributes(node, script);
          script.textContent = scriptContent;
        } else {
          copyElementAttributes(node, script);
          script.textContent = scriptContent;
        }

        elements.push(script);
        try {
          parent.appendChild(script);
        } catch (e: any) {
          sdkLog.warn(`Failed to append ${nodeName} element: ${e?.message}`);
        }
      }
      continue;
    }

    if (nodeName === "link") {
      if (!node.hasAttribute("href") || !node.hasAttribute("rel")) {
        sdkLog.warn(`Ignoring invalid ${nodeName} element: missing href or rel`);
        continue;
      }
      const link = document.createElement("link");
      copyElementAttributes(node, link);
      elements.push(link);
      try {
        parent.appendChild(link);
      } catch (e: any) {
        sdkLog.warn(`Failed to append link ${link.getAttribute("href")}: ${e?.message}`);
      }
    }
  }

  return elements;
}
