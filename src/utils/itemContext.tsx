/**
 * Item context for data-bound repeater rendering.
 *
 * When a Container has a `dataSource`, it renders children once per item.
 * Each iteration wraps children in an ItemProvider so Text/Image/Button
 * components can resolve {{item.*}} variables via useItemContext().
 */

import React, { createContext, useContext } from "react";

const ItemCtx = createContext<Record<string, any> | null>(null);

/** Get the current repeater item (null if not inside a data-bound Container). */
export function useItemContext(): Record<string, any> | null {
  return useContext(ItemCtx);
}

/** Get the current repeater item index (-1 if not inside a repeater). */
const IndexCtx = createContext<number>(-1);
export function useItemIndex(): number {
  return useContext(IndexCtx);
}

export function ItemProvider({
  item,
  index,
  children,
}: {
  item: Record<string, any>;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <ItemCtx.Provider value={item}>
      <IndexCtx.Provider value={index}>{children}</IndexCtx.Provider>
    </ItemCtx.Provider>
  );
}
