import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../viewport/state/viewportExports";
import { getRect } from "../../../viewport/hooks/useRect";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { TbSearch, TbVariable } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { EditModifiersAtom } from "../../Label";
import { DesignVarDialogAtom } from "../../dialogs/DesignVarDialog";
import { useDialog } from "../../dialogs/toolHooks";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { CATEGORY_LABELS } from "./designVarConstants";
import { useDesignVarOptions, type DesignVar } from "./useDesignVarOptions";
import { ToolbarIconButton } from "../../../primitives/ToolbarIconButton";
import { OVERLAY_Z_MODAL } from "@/chrome/popovers/overlayZIndex";

interface DesignVarSelectorProps {
  propKey: string;
  propType: string;
  viewValue: string;
  prefix?: string; // Like "text", "bg", "border", "font"
}

export function DesignVarSelector({
  propKey,
  propType,
  viewValue,
  prefix = "",
}: DesignVarSelectorProps) {
  const [dialog, setDialog] = useAtomState(DesignVarDialogAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef<HTMLButtonElement>(null);

  const {
    actions: { setProp },
    id,
  } = useNode(node => ({
    id: node.id,
  }));

  const { query, actions } = useEditor();

  useDialog(dialog, setDialog, ref, propKey);

  const { groupedVars } = useDesignVarOptions(prefix, searchTerm);

  // Handle selecting a variable
  const handleSelect = (designVar: DesignVar) => {
    let view = viewValue;
    if (propType === "component" || propType === "root") {
      view = "component";
    }

    let value: string;

    if (propKey === "fontFamily") {
      value = `font-(${designVar.varName})`;
    } else if (propKey === "fontWeight" || propKey === "fontSize" || propKey === "lineHeight") {
      // Class-based props use the actual value (e.g., font-bold, text-xl)
      value = designVar.value;
    } else {
      // Colors use Tailwind arbitrary value syntax: "text-[var(--primary)]"
      value = prefix ? `${prefix}-[var(${designVar.varName})]` : `var(${designVar.varName})`;
    }

    changeProp({
      propKey,
      value,
      setProp,
      propType,
      view,
      query,
      actions,
      nodeId: id,
      classDark,
    });

    setDialog({ ...dialog, enabled: false });
    setSearchTerm("");
  };

  const closeDialog = () => {
    setDialog({ ...dialog, enabled: false });
    setSearchTerm("");
  };

  return (
    <>
      <ToolbarIconButton
        ref={ref}
        onClick={() => {
          setDialog({
            enabled: true,
            value: "",
            prefix,
            propKey,
            changed: handleSelect,
            e: getRect(ref.current),
          });
        }}
        variant="subtle"
        ariaLabel="Bind to design system variable"
        tooltip="Bind to design system variable"
      >
        <TbVariable className="size-3.5" />
      </ToolbarIconButton>

      {dialog.enabled && (
        <DesignVarDialog
          dialog={dialog}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          groupedVars={groupedVars}
          handleSelect={handleSelect}
          closeDialog={closeDialog}
        />
      )}
    </>
  );
}

// --- Portal dialog for design variable list ---

function DesignVarDialog({
  dialog,
  searchTerm,
  setSearchTerm,
  groupedVars,
  handleSelect,
  closeDialog,
}: {
  dialog: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  groupedVars: Record<string, DesignVar[]>;
  handleSelect: (designVar: DesignVar) => void;
  closeDialog: () => void;
}) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-design-var-dialog]")) {
        closeDialog();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDialog]);

  const rect = dialog.e;
  if (!rect) return null;

  const availableHeight = window.innerHeight - rect.bottom - 20;
  const maxHeight = Math.min(400, availableHeight, window.innerHeight * 0.6);
  const isUpward = availableHeight < 200;

  const style = isUpward
    ? {
        position: "absolute" as const,
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        zIndex: OVERLAY_Z_MODAL,
        maxHeight: Math.min(400, rect.top - 20, window.innerHeight * 0.6),
        width: 320,
      }
    : {
        position: "absolute" as const,
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: OVERLAY_Z_MODAL,
        maxHeight,
        width: 320,
      };

  return ReactDOM.createPortal(
    <>
      <div
        role="presentation"
        aria-hidden="true"
        className="pointer-events-auto fixed inset-0"
        style={{ zIndex: OVERLAY_Z_MODAL - 1 }}
        onClick={closeDialog}
      />

      <div style={style} className="pagehub-sdk-root pointer-events-auto" data-design-var-dialog>
        <div className="ph-panel overflow-hidden p-0">
          {/* Search input */}
          <div className="border-base-300 bg-neutral shrink-0 border-b px-2 pt-2 pb-1">
            <div className="relative">
              <TbSearch className="text-neutral-content absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="text"
                className="input-dialog-leading"
                placeholder="Search design variables..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
                {...toolbarInputNoAutocompleteProps}
              />
            </div>
          </div>

          {/* Variable list */}
          <div className="scrollbar-light max-h-80 overflow-y-auto p-2">
            {Object.keys(groupedVars).length === 0 ? (
              <div className="text-neutral-content p-3 text-center text-xs">No variables found</div>
            ) : (
              Object.entries(groupedVars).map(([category, vars]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="bg-neutral/30 text-neutral-content rounded px-2.5 py-1.5 text-[10px] font-semibold tracking-wider uppercase">
                    {CATEGORY_LABELS[category] || category}
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {(vars as DesignVar[]).map(v => (
                      <button
                        key={v.varName}
                        onClick={() => handleSelect(v)}
                        className="group hover:bg-neutral w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-base-content text-xs leading-tight font-medium">
                              {v.label}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-neutral-content shrink-0 font-mono text-[10px]">
                              {v.varName}
                            </span>
                            {v.category === "palette" && (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="border-base-300 size-3 shrink-0 rounded-lg border"
                                  style={{ backgroundColor: v.value }}
                                />
                                <span className="text-neutral-content text-[10px]">{v.value}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
