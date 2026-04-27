import React, { useState, useEffect, useRef } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { TbCheck, TbChevronDown, TbPencil, TbTrash } from "react-icons/tb";
import { AnchoredPopover } from "../overlays/AnchoredPopover";
import { PAGEHUB_RTT_GLOBAL_ID } from "../primitives/layout/tooltipSurface";

export interface VariablePopoverProps {
  variables: { id: string; label: string; group?: string }[];
  currentId: string;
  displayValue: string;
  onChangeVariable: (newId: string) => void;
  onEditValue?: (newValue: string) => void;
  onRemove: () => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

export function VariablePopover({
  variables,
  currentId,
  displayValue,
  onChangeVariable,
  onEditValue,
  onRemove,
  onClose,
  anchorRect,
}: VariablePopoverProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(displayValue);
  const [currentValue, setCurrentValue] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== currentValue) {
      onEditValue?.(trimmed);
      setCurrentValue(trimmed);
    }
    setEditing(false);
  };

  return (
    <AnchoredPopover
      open
      onOpenChange={openNext => {
        if (!openNext) onClose();
      }}
      anchorRect={anchorRect}
      placement="bottom-start"
      className="pagehub-sdk-root variable-popover"
    >
      <div className="variable-popover-header">Variable</div>

      <Listbox
        value={currentId}
        onChange={newId => {
          onChangeVariable(newId);
          onClose();
        }}
      >
        <ListboxButton className="input-plain flex w-full items-center justify-between gap-1 text-xs focus:border-transparent focus:outline-none">
          <span className="truncate">
            {variables.find(v => v.id === currentId)?.label ?? currentId} — {`{{${currentId}}}`}
          </span>
          <TbChevronDown className="shrink-0 opacity-50" size={12} />
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          transition
          className="pagehub-sdk-root ph-select-content z-999999!"
          modal={false}
        >
          {(() => {
            let lastGroup: string | undefined;
            return variables.map(v => {
              const showHeader = v.group && v.group !== lastGroup;
              lastGroup = v.group;
              return (
                <React.Fragment key={v.id}>
                  {showHeader && (
                    <div className="bg-base-200/80 text-neutral-content px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                      {v.group}
                    </div>
                  )}
                  <ListboxOption value={v.id} className="ph-select-item">
                    {({ selected }) => (
                      <>
                        <span className="flex w-4 shrink-0 items-center justify-center">
                          {selected && <TbCheck size={12} />}
                        </span>
                        {v.label} —{" "}
                        <span className="font-mono text-[10px] opacity-60">{`{{${v.id}}}`}</span>
                      </>
                    )}
                  </ListboxOption>
                </React.Fragment>
              );
            });
          })()}
        </ListboxOptions>
      </Listbox>

      {editing ? (
        <>
          <input
            ref={inputRef}
            className="variable-popover-input"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <div className="variable-popover-actions">
            <button className="variable-popover-btn variable-popover-btn-save" onClick={handleSave}>
              Save
            </button>
            <button
              className="variable-popover-btn variable-popover-btn-cancel"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="variable-popover-value-row">
          <div className="variable-popover-value">{currentValue}</div>
          <div className="variable-popover-toolbar">
            {onEditValue && currentId !== "year" && (
              <button
                className="variable-popover-icon-btn"
                onClick={() => {
                  setEditText(currentValue);
                  setEditing(true);
                }}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Edit value"
              >
                <TbPencil size={13} />
              </button>
            )}
            <button
              className="variable-popover-icon-btn variable-popover-icon-btn-danger"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
                onClose();
              }}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Remove variable"
            >
              <TbTrash size={13} />
            </button>
          </div>
        </div>
      )}
    </AnchoredPopover>
  );
}
