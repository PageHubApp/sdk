import React from "react";
import { TbPuzzle } from "react-icons/tb";

/**
 * Resolve a craft / preset `icon` field to a React component (same rules as toolbox sidebar).
 */
export function resolveToolboxIcon(icon: unknown): React.ComponentType<{ className?: string }> {
  if (!icon) return TbPuzzle;
  if (typeof icon === "function") return icon as React.ComponentType<{ className?: string }>;
  if (React.isValidElement(icon)) {
    const IconWrapper = () => icon;
    IconWrapper.displayName = "ResolvedToolboxIcon";
    return IconWrapper as React.ComponentType<{ className?: string }>;
  }
  if (typeof icon === "string") {
    const EmojiIcon = () => <span className="text-base leading-none">{icon}</span>;
    EmojiIcon.displayName = "ToolboxEmojiIcon";
    return EmojiIcon as React.ComponentType<{ className?: string }>;
  }
  return TbPuzzle;
}
