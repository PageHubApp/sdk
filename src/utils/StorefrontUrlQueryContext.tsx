import React, { createContext, useContext } from "react";
import type { StorefrontUrlQuery } from "./storefrontDataSource";

const Ctx = createContext<StorefrontUrlQuery | null>(null);

export function StorefrontUrlQueryProvider({
  value,
  children,
}: {
  value: StorefrontUrlQuery | null;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Same storefront query shape as prepareViewerProps / fetchConnectorDataForPage. */
export function useStorefrontUrlQuery(): StorefrontUrlQuery {
  return useContext(Ctx) ?? {};
}
