import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { SuggestionProps } from "../../extensions/VariableNode";

/**
 * Floating popup that appears when the user types {{ in the TipTap editor.
 * Shows available template variables and inserts the selected one.
 */
export function VariableSuggestionPopup({ suggestion }: {
  suggestion: SuggestionProps | null;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestion?.query]);

  // Keyboard navigation
  useEffect(() => {
    if (!suggestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { items, command } = suggestion;
      if (!items.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        command(items[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        // The plugin will close via state change
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [suggestion, selectedIndex]);

  if (!suggestion || !suggestion.items.length) return null;

  const rect = suggestion.clientRect?.();
  if (!rect) return null;

  return ReactDOM.createPortal(
    <div
      ref={listRef}
      className="pagehub-sdk-root variable-suggestion-popup"
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: 99999,
      }}
    >
      <div className="rounded-lg border border-base-300 bg-base-200 p-1 shadow-xl">
        <div className="mb-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-content">
          Variables
        </div>
        {suggestion.items.map((item, index) => (
          <button
            key={item.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              suggestion.command(item);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              index === selectedIndex
                ? "bg-accent text-accent-content"
                : "text-neutral-content hover:bg-accent/50"
            }`}
          >
            <span className="flex h-5 items-center rounded bg-primary/10 px-1.5 font-mono text-[10px] text-primary">
              {"{{"}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="font-mono text-[10px] text-neutral-content/60">
              {item.id}
            </span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
