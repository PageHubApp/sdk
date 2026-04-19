import React, { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/router";
import type { PrepareViewerRoute } from "./pathPatternParams";
import { getPathTailSegments, matchPathPattern } from "./pathPatternParams";

const Ctx = createContext<Record<string, string>>({});

export function RouteParamsProvider({
  route,
  pathPattern,
  pathTailSegments,
  children,
}: {
  /** When null, context is `{}` (no path-driven params). */
  route: PrepareViewerRoute | null;
  pathPattern: string | null;
  /**
   * Pre-computed path tail from the server. Preferred — guarantees server/client parity
   * because Next's `useRouter().query` is empty during initial SSR of pages/* routes.
   */
  pathTailSegments?: string[];
  children: React.ReactNode;
}) {
  const r = useRouter();

  const value = useMemo(() => {
    if (!pathPattern?.trim()) {
      return {};
    }
    const tail = pathTailSegments
      ? pathTailSegments
      : route
        ? getPathTailSegments(route, {
            query: r.query as Record<string, string | string[] | undefined>,
            catchAllSlug:
              typeof r.query.slug === "string"
                ? [r.query.slug]
                : Array.isArray(r.query.slug)
                  ? (r.query.slug as string[])
                  : [],
          })
        : [];
    return matchPathPattern(pathPattern, tail) ?? {};
  }, [route, pathPattern, pathTailSegments, r.asPath, r.query]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRouteParams(): Record<string, string> {
  return useContext(Ctx);
}
