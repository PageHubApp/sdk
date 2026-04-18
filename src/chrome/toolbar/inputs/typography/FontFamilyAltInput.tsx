import { useEditor, useNode } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useRef } from "react";
import { resolveCSSVariable } from "@/utils/design/colorSystem";
import { ViewAtom } from "../../../viewport/atoms";
import { changeProp, getPropFinalValue } from "../../../viewport/viewportExports";
import { getRect } from "../../../viewport/useRect";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import {
  googleFontNameToClass,
  parseGoogleFontFromArbitraryClass,
  tailwindTokenBase,
} from "@/utils/tailwind/fontFamilyClass";
import { Wrap } from "../../ToolbarStyle";
import { ViewSelectionAtom } from "../../Label";
import { FontFamilyDialogAtom } from "../../dialogs/FontFamilyDialog";
import { useDialog } from "../../dialogs/toolHooks";

function displayFontFromToken(token: string, query: any): string {
  if (!token) return "";
  const base = tailwindTokenBase(token);
  if (/^font-\(--/.test(base)) {
    const r = resolveCSSVariable(base, query);
    if (r && typeof r === "string" && !r.includes("var(")) {
      return r
        .split(",")[0]
        .trim()
        .replace(/^['"]|['"]$/g, "");
    }
  }
  const g = parseGoogleFontFromArbitraryClass(base);
  return g || token;
}

export const FontFamilyAltInput = ({
  propKey,
  label = "",
  prefix = "",
  index = null,
  propItemKey = "",
  propType = "class",
  inline = true,
  inputWidth = "",
  labelWidth = "",
}) => {
  const [dialog, setDialog] = useAtomState(FontFamilyDialogAtom);
  const { actions, query } = useEditor();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data?.props || {},
    id: node.id,
  }));

  const propsForGet = { propKey, propType, index, propItemKey };
  const { value: resolved } = getPropFinalValue(propsForGet, view, nodeProps, classDark);
  const value = resolved || "";
  const displayValue = value ? displayFontFromToken(value, query) : "";

  const classWriteView = propType === "class" ? editorCanvasViewToClassPrefixKey(view) : undefined;

  const pushChange = (nextClass: string, delay = 0) => {
    changeProp(
      {
        propType,
        propKey,
        value: nextClass,
        setProp,
        index,
        propItemKey,
        query,
        actions,
        nodeId: id,
        ...(propType === "class" && classWriteView != null
          ? { view: classWriteView, classDark }
          : {}),
      },
      delay
    );
  };

  /** `string` = already a stored class token (reset preview). Array = Google family name from dialog. */
  const applyFontPick = (picked, delay = 0) => {
    if (typeof picked === "string") {
      pushChange(picked, delay);
      return;
    }
    const name = Array.isArray(picked) ? picked[0] : picked;
    const cls = name ? googleFontNameToClass(String(name)) : "";
    pushChange(cls, delay);
  };

  const changed = picked => applyFontPick(picked, 2000);
  const preview = picked => applyFontPick(picked, 0);

  const ref = useRef(null);

  useDialog(dialog, setDialog, ref, propKey);

  let viewValue: string | number = view;
  if (propType === "component" || propType === "root") {
    viewValue = "component";
  } else if (index) {
    viewValue = typeof index === "number" ? index : String(index);
  }

  return (
    <div ref={ref}>
      <Wrap
        props={{
          label,
          labelHide: false,
          showVarSelector: true,
          varSelectorPrefix: "",
        }}
        lab={value}
        viewValue={String(viewValue)}
        propType={propType}
        propKey={propKey}
        inline={inline}
        inputWidth={inputWidth}
        labelWidth={labelWidth}
      >
        <div className="relative">
          <div className="input-wrapper flex w-full items-center">
            <button
              type="button"
              title={displayValue}
              id={propKey ? `input-${propKey}` : undefined}
              onClick={() => {
                setDialog({
                  enabled: true,
                  value: [],
                  originalValue: value || "",
                  prefix,
                  propKey,
                  changed,
                  preview,
                  e: getRect(ref.current),
                });
              }}
              style={{
                fontFamily: displayValue || undefined,
              }}
              className="input-plain flex min-w-0 flex-1 items-center truncate text-left"
            >
              {displayValue || "Default"}
            </button>
          </div>

          {value && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                pushChange("", 2000);
              }}
              className="bg-error text-error-content hover:bg-error/90 absolute -top-1 -right-1 z-10 flex size-4 items-center justify-center rounded-full text-xs font-bold"
              title="Clear font family"
            >
              ×
            </button>
          )}
        </div>
      </Wrap>
    </div>
  );
};
