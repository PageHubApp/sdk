/**
 * Custom JS handlers (props.handlers) — author-defined event handlers
 * compiled from code strings. Composes with any handler already on `prop` —
 * existing action runs first, custom handler second.
 */

const handlerCache = new Map<string, (event: any) => void>();

function compileHandler(code: string): ((event: any) => void) | null {
  let fn = handlerCache.get(code);
  if (fn) return fn;
  try {
    fn = new Function("event", code) as (event: any) => void;
  } catch (err) {
    console.warn("[PageHub] invalid handler", err);
    return null;
  }
  handlerCache.set(code, fn);
  return fn;
}

/**
 * Attach author-defined JS event handlers declared on `props.handlers`.
 * Keys must look like React event props (`onClick`, `onMouseEnter`, ...);
 * values are code strings evaluated as function bodies with `event` in scope.
 *
 * Skipped entirely in editor mode so every keystroke in the handler code
 * editor doesn't compile a new function and pollute the cache.
 */
export function addCustomHandlers(
  prop: Record<string, any>,
  handlers: unknown,
  enabled: boolean
): void {
  if (enabled) return;
  if (!handlers || typeof handlers !== "object") return;
  for (const [eventName, code] of Object.entries(handlers as Record<string, unknown>)) {
    if (typeof code !== "string" || !code.trim()) continue;
    if (!/^on[A-Z]/.test(eventName)) continue;
    const compiled = compileHandler(code);
    if (!compiled) continue;

    const existing = prop[eventName];
    prop[eventName] = (event: any) => {
      if (typeof existing === "function") existing(event);
      try {
        compiled(event);
      } catch (err) {
        console.warn("[PageHub] handler runtime error", err);
      }
    };
  }
}
