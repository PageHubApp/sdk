import { createContext, useContext } from "react";

/**
 * Context to tell node controllers they're being rendered inline
 * instead of portaled, so they should use simple CSS positioning
 * instead of calculating positions with getBoundingClientRect
 */
export const InlineRenderContext = createContext(false);

export const useIsInlineRender = () => useContext(InlineRenderContext);
