/**
 * Shared handler-code transform — bakes `handlerOptions` (currently just
 * `preventDefault`) into the author's JS string before it's handed to either
 * runtime path.
 *
 * Both consumers — React (`addCustomHandlers` → `new Function`) and static
 * HTML (`handlerAttrs` → `onclick=""`) — go through this single function so
 * "what does the handler do given these options" has one source of truth.
 * Add more option-driven prefixes here (e.g. stopPropagation) and both paths
 * pick it up automatically.
 */

export interface HandlerOptions {
  preventDefault?: boolean;
}

export function applyHandlerOptions(code: string, options?: HandlerOptions | null): string {
  if (!options) return code;
  let out = code;
  if (options.preventDefault) out = `event.preventDefault(); ${out}`;
  return out;
}

export function readHandlerOptions(
  handlerOptions: unknown,
  eventName: string
): HandlerOptions | null {
  if (!handlerOptions || typeof handlerOptions !== "object") return null;
  const entry = (handlerOptions as Record<string, HandlerOptions | undefined>)[eventName];
  return entry ?? null;
}
