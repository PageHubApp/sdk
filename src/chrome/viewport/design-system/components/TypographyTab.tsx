import { type CSSProperties, type MouseEvent } from "react";
import { TbChevronDown, TbTrash } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { ToolbarDropdown } from "../../../toolbar/ToolbarDropdown";
import { ToolbarDashedButton } from "../../../toolbar/helpers/ToolbarDashedButton";
import { ToolbarSection } from "../../../toolbar/ToolbarSection";
import type { UseDesignSystemReturn } from "../hooks/useDesignSystem";

interface TypographyTabProps {
  ds: UseDesignSystemReturn;
}

export function TypographyTab({ ds }: TypographyTabProps) {
  const { styles, updateStyle, customFonts } = ds;

  return (
    <div className="space-y-0">
      <div className="px-3 pt-2 pb-3">
        <ToolbarDashedButton onClick={ds.addFont} className="w-full">
          Add font
        </ToolbarDashedButton>
      </div>

      {customFonts.length > 0 && (
        <div className="border-base-300 border-t">
          {customFonts.map((font, index) => (
            <FontAccordion
              key={index}
              index={index}
              font={font}
              onDelete={() => ds.deleteFont(index)}
              onUpdateName={value => ds.updateFontName(index, value)}
              onUpdateProperty={(key, value) => ds.updateFontProperty(index, key as any, value)}
              onOpenFontDialog={buttonEl => {
                const rect = buttonEl.getBoundingClientRect();
                ds.setFontDialog({
                  enabled: true,
                  value: font.fontFamily ? [font.fontFamily] : [],
                  originalValue: font.fontFamily ? [font.fontFamily] : [],
                  changed: (value: unknown) => {
                    const fontFamily = Array.isArray(value)
                      ? (value as string[])[0]
                      : (value as string);
                    ds.updateFontProperty(index, "fontFamily", fontFamily);
                  },
                  preview: (value: unknown) => {
                    const fontFamily = Array.isArray(value)
                      ? (value as string[])[0]
                      : (value as string);
                    ds.updateFontProperty(index, "fontFamily", fontFamily);
                  },
                  e: rect,
                });
              }}
            />
          ))}
        </div>
      )}

      <ToolbarSection title="Type" defaultOpen showChevron>
        <FontSelect
          id="ds-heading-font-weight"
          label="Heading Font Weight"
          value={styles.headingFont}
          onChange={v => updateStyle("headingFont", v)}
          options={[
            "font-normal:Normal",
            "font-medium:Medium",
            "font-semibold:Semibold",
            "font-bold:Bold",
            "font-extrabold:Extra Bold",
          ]}
        />

        <div>
          <label
            htmlFor="ds-heading-font-family"
            className="text-neutral-content mb-1 block text-xs font-medium"
          >
            Heading Font Family
          </label>
          <button
            type="button"
            id="ds-heading-font-family"
            ref={ds.headingFontButtonRef}
            onClick={ds.openHeadingFontPicker}
            className="input-dialog-sm text-base-content flex w-full items-center justify-between gap-2 text-left font-medium"
            style={{ fontFamily: styles.headingFontFamily }}
          >
            <span className="truncate">{styles.headingFontFamily || "Select font..."}</span>
            <TbChevronDown className="text-neutral-content/60 size-3 shrink-0" />
          </button>
        </div>

        <FontSelect
          id="ds-body-font-weight"
          label="Body Font Weight"
          value={styles.bodyFont}
          onChange={v => updateStyle("bodyFont", v)}
          options={[
            "font-thin:Thin",
            "font-extralight:Extra Light",
            "font-light:Light",
            "font-normal:Normal",
            "font-medium:Medium",
            "font-semibold:Semibold",
          ]}
        />

        <div>
          <label
            htmlFor="ds-body-font-family"
            className="text-neutral-content mb-1 block text-xs font-medium"
          >
            Body Font Family
          </label>
          <button
            type="button"
            id="ds-body-font-family"
            ref={ds.bodyFontButtonRef}
            onClick={ds.openBodyFontPicker}
            className="input-dialog-sm text-base-content flex w-full items-center justify-between gap-2 text-left font-medium"
            style={{ fontFamily: styles.bodyFontFamily }}
          >
            <span className="truncate">{styles.bodyFontFamily || "Select font..."}</span>
            <TbChevronDown className="text-neutral-content/60 size-3 shrink-0" />
          </button>
        </div>
      </ToolbarSection>
    </div>
  );
}

const labelDense =
  "mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-base-content/45";
const labelDefault = "mb-1 block text-xs font-medium text-neutral-content";

/** Options format: "value:Label" (value before first colon). */
function FontSelect({
  id,
  label,
  value,
  onChange,
  options = [],
  dense = false,
  familyButton,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  options?: string[];
  dense?: boolean;
  familyButton?: {
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
    displayValue: string;
    style?: CSSProperties;
  };
}) {
  const lb = dense ? labelDense : labelDefault;
  if (familyButton) {
    return (
      <div className="space-y-1">
        <span id={`${id}-lbl`} className={lb}>
          {label}
        </span>
        <button
          type="button"
          id={id}
          aria-labelledby={`${id}-lbl`}
          onClick={familyButton.onClick}
          className="input-dialog-sm text-base-content flex w-full items-center justify-between gap-2 text-left font-medium"
          style={familyButton.style}
        >
          <span className="truncate">{familyButton.displayValue}</span>
          <TbChevronDown className="text-neutral-content/60 size-3 shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className={lb}>
        {label}
      </label>
      <ToolbarDropdown value={value} onChange={v => onChange?.(v)} placeholder={label} propKey={id}>
        {options.map(opt => {
          const [val, lbl] = opt.split(":");
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </ToolbarDropdown>
    </div>
  );
}

function FontAccordion({
  font,
  index,
  onDelete,
  onUpdateName,
  onUpdateProperty,
  onOpenFontDialog,
}: {
  font: {
    name: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing?: string;
    textTransform?: string;
  };
  index: number;
  onDelete: () => void;
  onUpdateName: (value: string) => void;
  onUpdateProperty: (key: string, value: string) => void;
  onOpenFontDialog: (buttonEl: HTMLButtonElement) => void;
}) {
  return (
    <ToolbarSection
      title={font.name || "Font"}
      defaultOpen
      showChevron
      header={
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Remove font"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
          className="text-base-content/50 hover:text-error rounded p-1 transition-colors"
          aria-label="Remove font"
        >
          <TbTrash className="size-4" aria-hidden />
        </button>
      }
    >
      <div className="space-y-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-neutral-content block text-xs font-medium">Token name</label>
        </div>

        <input
          type="text"
          value={font.name}
          onChange={e => onUpdateName(e.target.value)}
          className="input-dialog-sm text-base-content placeholder:text-neutral-content/60 w-full font-medium"
          placeholder="Caption"
          aria-label="Custom font token name"
        />

        <FontSelect
          id={`ds-font-family-${index}`}
          label="Font family"
          value={font.fontFamily}
          familyButton={{
            onClick: (e: MouseEvent<HTMLButtonElement>) => onOpenFontDialog(e.currentTarget),
            displayValue: font.fontFamily || "Choose typeface…",
            style: { fontFamily: font.fontFamily },
          }}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <FontSelect
            id={`ds-font-size-${index}`}
            label="Size"
            value={font.fontSize}
            onChange={v => onUpdateProperty("fontSize", v)}
            dense
            options={[
              "0.625rem:XS",
              "0.75rem:SM",
              "0.875rem:Base-",
              "1rem:Base",
              "1.125rem:LG",
              "1.25rem:XL",
              "1.5rem:2XL",
              "1.875rem:3XL",
              "2rem:4XL",
              "2.25rem:4XL+",
              "3rem:5XL",
              "3.75rem:6XL",
              "4.5rem:7XL",
              "6rem:8XL",
              "8rem:9XL",
            ]}
          />
          <FontSelect
            id={`ds-font-weight-${index}`}
            label="Weight"
            value={font.fontWeight}
            onChange={v => onUpdateProperty("fontWeight", v)}
            dense
            options={[
              "100:Thin",
              "200:Extra Light",
              "300:Light",
              "400:Normal",
              "500:Medium",
              "600:Semi Bold",
              "700:Bold",
              "800:Extra Bold",
              "900:Black",
            ]}
          />
          <FontSelect
            id={`ds-line-height-${index}`}
            label="Line height"
            value={font.lineHeight}
            onChange={v => onUpdateProperty("lineHeight", v)}
            dense
            options={[
              "1:None",
              "1.15:Tight",
              "1.2:Snug",
              "1.25:Compact",
              "1.375:Normal-",
              "1.5:Normal",
              "1.625:Relaxed",
              "1.75:Loose",
              "2:Extra",
            ]}
          />
          <FontSelect
            id={`ds-letter-spacing-${index}`}
            label="Tracking"
            value={font.letterSpacing || "normal"}
            onChange={v => onUpdateProperty("letterSpacing", v)}
            dense
            options={[
              "-0.05em:Tighter",
              "-0.025em:Tight",
              "normal:Normal",
              "0.025em:Wide",
              "0.05em:Wider",
              "0.1em:Widest",
            ]}
          />
          <div className="sm:col-span-2">
            <FontSelect
              id={`ds-text-transform-${index}`}
              label="Transform"
              value={font.textTransform || "none"}
              onChange={v => onUpdateProperty("textTransform", v)}
              dense
              options={[
                "none:None",
                "uppercase:UPPERCASE",
                "lowercase:lowercase",
                "capitalize:Capitalize",
              ]}
            />
          </div>
        </div>

        <div className="border-base-300/60 bg-base-200/25 border-t px-3 py-2.5">
          <p className="text-base-content/40 mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
            Preview
          </p>
          <div
            style={{
              fontFamily: font.fontFamily,
              fontSize: font.fontSize,
              fontWeight: font.fontWeight,
              lineHeight: font.lineHeight,
              letterSpacing: font.letterSpacing || "normal",
              textTransform: (font.textTransform || "none") as CSSProperties["textTransform"],
            }}
            className="text-base-content text-[13px] leading-snug"
          >
            The quick brown fox jumps over the lazy dog
          </div>
        </div>
      </div>
    </ToolbarSection>
  );
}
