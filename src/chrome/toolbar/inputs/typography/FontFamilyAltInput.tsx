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
import { Chip } from "@/chrome/primitives/Chip";
import { ViewSelectionAtom } from "../../Label";
import { FontFamilyDialogAtom } from "../../dialogs/FontFamilyDialog";
import { useDialog } from "../../dialogs/toolHooks";
import { InlineClearButton } from "../../../primitives/InlineClearButton";

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
  propType = "class", inline = true,
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
      <Chip
        label={label}
        propType={propType}
        propKey={propKey}
        labelWidth={labelWidth}
        onLabelClick={() => {
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
        trailing={
          value ? (
            <InlineClearButton onClick={() => pushChange("", 2000)} tooltip="Clear font family" />
          ) : null
        }
      >
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
      </Chip>
    </div>
  );
};
