/**
 * Resolve {{params.name}} placeholders in dataSource (and nested filter) strings.
 * Used server-side before storefront merge + binding id, and client-side in Container.
 * Unknown {{params.x}} tokens become empty strings.
 */

function interpolateParamsInString(s: string, params: Record<string, string>): string {
  if (!s.includes("{{params.")) return s;
  let out = s;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{{params.${k}}}`).join(v);
  }
  return out.replace(/\{\{params\.[^}]+\}\}/g, "");
}

export function applyRouteParamsToDataSource<T>(ds: T, params: Record<string, string> | null | undefined): T {
  if (ds == null) {
    return ds;
  }
  return walkDeep(ds, params ?? {}) as T;
}

function walkDeep(val: unknown, params: Record<string, string>): unknown {
  if (typeof val === "string") {
    return interpolateParamsInString(val, params);
  }
  if (Array.isArray(val)) {
    return val.map(v => walkDeep(v, params));
  }
  if (val && typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = walkDeep(v, params);
    }
    return out;
  }
  return val;
}
