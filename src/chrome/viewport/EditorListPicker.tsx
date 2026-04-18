import React, { useEffect, useRef } from "react";

export interface EditorListPickerProps {
  /** Merged onto the root `relative` wrapper (layout, width). */
  className?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** Only invoked when the menu closes due to an outside pointer event. */
  onDismiss?: () => void;
  /** Trigger control(s); typically a `button` toggling `setIsOpen`. */
  trigger: React.ReactNode;
  /** Optional node between trigger and flyout (e.g. external preview link). */
  afterTrigger?: React.ReactNode;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Scrollable list body (items, empty states). */
  children: React.ReactNode;
  /** Footer block (create actions, secondary rows). Top border is applied by this shell. */
  footer?: React.ReactNode;
}

/**
 * Shared chrome: anchored flyout with search field, scroll region, optional footer,
 * and outside-dismiss handling (matches Page / Component selector UX).
 */
export function EditorListPicker({
  className = "",
  isOpen,
  setIsOpen,
  onDismiss,
  trigger,
  afterTrigger,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  children,
  footer,
}: EditorListPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onDismiss?.();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handlePointerDownOutside);
      return () => document.removeEventListener("mousedown", handlePointerDownOutside);
    }
  }, [isOpen, setIsOpen, onDismiss]);

  return (
    <div className={`relative ${className}`.trim()} ref={rootRef}>
      {trigger}
      {afterTrigger}
      {isOpen ? (
        <div className="ph-panel text-base-content absolute inset-x-0 top-full z-50 mt-1 flex max-h-[500px] min-w-[280px] flex-col overflow-hidden">
          <div className="border-base-300 border-b p-3">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              className="input-transparent"
              autoFocus
            />
          </div>
          <div className="scrollbar bg-base-100 text-base-content flex-1 overflow-y-auto">
            {children}
          </div>
          {footer != null ? (
            <div className="border-base-300 shrink-0 border-t">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
