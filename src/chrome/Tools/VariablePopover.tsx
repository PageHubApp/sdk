// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export interface VariablePopoverProps {
  variables: { id: string; label: string }[];
  currentId: string;
  displayValue: string;
  onChangeVariable: (newId: string) => void;
  onRemove: () => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

export const VariablePopover: React.FC<VariablePopoverProps> = ({
  variables,
  currentId,
  displayValue,
  onChangeVariable,
  onRemove,
  onClose,
  anchorRect,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target) && !target.closest("[data-headlessui-state]")) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handleOutside), 0);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="pagehub-sdk-root variable-popover"
      style={{
        position: "fixed",
        left: anchorRect.left,
        top: anchorRect.bottom + 4,
        zIndex: 99999,
      }}
    >
      <div className="variable-popover-header">Variable</div>

      <Listbox
        value={currentId}
        onChange={(newId) => {
          onChangeVariable(newId);
          onClose();
        }}
      >
        <ListboxButton className="input-plain flex w-full items-center justify-between gap-1 text-xs focus:border-transparent focus:outline-none">
          <span className="truncate">
            {variables.find(v => v.id === currentId)?.label ?? currentId} — {`{{${currentId}}}`}
          </span>
          <span className="shrink-0 opacity-50">
            <ChevronDown />
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          className="pagehub-sdk-root ph-select-content !z-[999999]"
          modal={false}
        >
          {variables.map(v => (
            <ListboxOption
              key={v.id}
              value={v.id}
              className="ph-select-item"
            >
              {({ selected }) => (
                <>
                  <span className="flex w-4 shrink-0 items-center justify-center">
                    {selected && <Check />}
                  </span>
                  {v.label} — <span className="font-mono text-[10px] opacity-60">{`{{${v.id}}}`}</span>
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>

      <div className="variable-popover-value">{displayValue}</div>

      <button
        className="variable-popover-remove"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
          onClose();
        }}
      >
        Remove
      </button>
    </div>
  );
};
