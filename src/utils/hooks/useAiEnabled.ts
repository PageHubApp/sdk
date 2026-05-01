import { useSDK } from "../../core/context";

/**
 * Whether AI-related **chrome** is enabled (`features.aiGeneration`).
 * Does not imply the SDK bundles or calls an AI backend — only toggles affordances
 * (docked panel via `aiPanel`, toolbar/media slots, etc.).
 */
export function useAiEnabled(): boolean {
  const { features } = useSDK();
  return features.aiGeneration;
}
