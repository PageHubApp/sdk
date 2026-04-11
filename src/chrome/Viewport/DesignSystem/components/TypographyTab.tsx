import type { CSSProperties, MouseEvent } from "react";
import { TbChevronDown, TbChevronRight, TbPlus, TbTrash } from "react-icons/tb";
import type { UseDesignSystemReturn } from "../hooks/useDesignSystem";

interface TypographyTabProps {
  ds: UseDesignSystemReturn;
}

export function TypographyTab({ ds }: TypographyTabProps) {
  const { styles, updateStyle, expandedSections, toggleSection, customFonts } = ds;

  return (
    <div className="space-y-0">
      {/* Type Section */}
      <div className="border-b border-base-300 last:border-b-0">
        <button
          type="button"
          onClick={() => toggleSection("typography")}
          className="flex w-full items-center justify-between bg-neutral px-3 py-2 text-left transition-colors hover:bg-neutral/80"
          aria-expanded={!!expandedSections.typography}
        >
          <span className="text-sm font-semibold text-neutral-content">Type</span>
          {expandedSections.typography ? (
            <TbChevronDown className="text-neutral-content" size={18} />
          ) : (
            <TbChevronRight className="text-neutral-content" size={18} />
          )}
        </button>
        {expandedSections.typography && (
          <div className="space-y-3 bg-base-100 p-3 text-base-content">
            <div>
              <label htmlFor="ds-heading-font-weight" className="mb-1 block text-xs font-medium text-neutral-content">
                Heading Font Weight
              </label>
              <select
                id="ds-heading-font-weight"
                value={styles.headingFont}
                onChange={e => updateStyle("headingFont", e.target.value)}
                className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="font-normal">Normal</option>
                <option value="font-medium">Medium</option>
                <option value="font-semibold">Semibold</option>
                <option value="font-bold">Bold</option>
                <option value="font-extrabold">Extra Bold</option>
              </select>
            </div>

            <div>
              <label htmlFor="ds-heading-font-family" className="mb-1 block text-xs font-medium text-neutral-content">
                Heading Font Family
              </label>
              <button
                type="button"
                id="ds-heading-font-family"
                ref={ds.headingFontButtonRef}
                onClick={ds.openHeadingFontPicker}
                className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-left text-sm text-base-content hover:bg-neutral focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ fontFamily: styles.headingFontFamily }}
              >
                {styles.headingFontFamily || "Select font..."}
              </button>
            </div>

            <div>
              <label htmlFor="ds-body-font-weight" className="mb-1 block text-xs font-medium text-neutral-content">
                Body Font Weight
              </label>
              <select
                id="ds-body-font-weight"
                value={styles.bodyFont}
                onChange={e => updateStyle("bodyFont", e.target.value)}
                className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="font-thin">Thin</option>
                <option value="font-extralight">Extra Light</option>
                <option value="font-light">Light</option>
                <option value="font-normal">Normal</option>
                <option value="font-medium">Medium</option>
                <option value="font-semibold">Semibold</option>
              </select>
            </div>

            <div>
              <label htmlFor="ds-body-font-family" className="mb-1 block text-xs font-medium text-neutral-content">
                Body Font Family
              </label>
              <button
                type="button"
                id="ds-body-font-family"
                ref={ds.bodyFontButtonRef}
                onClick={ds.openBodyFontPicker}
                className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-left text-sm text-base-content hover:bg-neutral focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ fontFamily: styles.bodyFontFamily }}
              >
                {styles.bodyFontFamily || "Select font..."}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom fonts — cards sit on a slightly tinted band so they read as groups */}
      <div className="space-y-3 border-t border-base-300 bg-base-200/15 p-3 pb-6 text-base-content">
        {customFonts.map((font, index) => (
          <article
            key={index}
            className="group overflow-hidden rounded-xl border border-base-300/80 bg-base-100 shadow-sm ring-1 ring-base-300/30"
          >
            {/* Title row — reads like a settings group header */}
            <div className="flex items-center gap-2 border-b border-base-300/70 bg-base-200/35 px-3 py-2.5">
              <input
                type="text"
                value={font.name}
                onChange={e => ds.updateFontName(index, e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold tracking-tight text-base-content placeholder:text-base-content/35 placeholder:font-medium focus:outline-none focus:ring-0"
                placeholder="Token name (e.g. Caption)"
                aria-label="Custom font token name"
              />
              <button
                type="button"
                onClick={() => ds.deleteFont(index)}
                className="btn btn-ghost btn-square size-8 min-h-0 shrink-0 text-base-content/50 hover:bg-error/10 hover:text-error"
                title="Remove font"
              >
                <TbTrash className="size-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-2.5 p-3">
              <FontSelect
                id={`ds-font-family-${index}`}
                label="Font family"
                value={font.fontFamily}
                familyButton={{
                  onClick: (e: MouseEvent<HTMLButtonElement>) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    ds.setFontDialog({
                      enabled: true,
                      value: font.fontFamily ? [font.fontFamily] : [],
                      originalValue: font.fontFamily ? [font.fontFamily] : [],
                      changed: (value: unknown) => {
                        const fontFamily = Array.isArray(value) ? (value as string[])[0] : (value as string);
                        ds.updateFontProperty(index, "fontFamily", fontFamily);
                      },
                      preview: (value: unknown) => {
                        const fontFamily = Array.isArray(value) ? (value as string[])[0] : (value as string);
                        ds.updateFontProperty(index, "fontFamily", fontFamily);
                      },
                      e: rect,
                    });
                  },
                  displayValue: font.fontFamily || "Choose typeface…",
                  style: { fontFamily: font.fontFamily },
                }}
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FontSelect
                  id={`ds-font-size-${index}`}
                  label="Size"
                  value={font.fontSize}
                  onChange={v => ds.updateFontProperty(index, "fontSize", v)}
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
                  onChange={v => ds.updateFontProperty(index, "fontWeight", v)}
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
                  onChange={v => ds.updateFontProperty(index, "lineHeight", v)}
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
                  onChange={v => ds.updateFontProperty(index, "letterSpacing", v)}
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
                    onChange={v => ds.updateFontProperty(index, "textTransform", v)}
                    dense
                    options={["none:None", "uppercase:UPPERCASE", "lowercase:lowercase", "capitalize:Capitalize"]}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-base-300/60 bg-base-200/25 px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                Preview
              </p>
              <div
                style={{
                  fontFamily: font.fontFamily,
                  fontSize: font.fontSize,
                  fontWeight: font.fontWeight,
                  lineHeight: font.lineHeight,
                  letterSpacing: font.letterSpacing || "normal",
                  textTransform: (font.textTransform || "none") as React.CSSProperties["textTransform"],
                }}
                className="text-[13px] leading-snug text-base-content"
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          </article>
        ))}

        <button
          type="button"
          onClick={ds.addFont}
          className="btn btn-outline flex w-full items-center justify-center gap-2 border-base-content/30 normal-case"
        >
          <TbPlus className="size-4 shrink-0" aria-hidden />
          Add font
        </button>
      </div>
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
  const controlDense =
    "select select-bordered select-sm w-full min-h-8 h-8 border-base-300/90 bg-base-100 py-0 pr-8 text-xs leading-tight text-base-content focus:outline-none focus:ring-2 focus:ring-ring";
  const controlDefault =
    "w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-ring";

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
          className={`${controlDefault} text-left hover:bg-base-200/80`}
          style={familyButton.style}
        >
          {familyButton.displayValue}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className={lb}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className={dense ? controlDense : controlDefault}
      >
        {options.map(opt => {
          const [val, lbl] = opt.split(":");
          return (
            <option key={val} value={val}>
              {`${lbl} (${val})`}
            </option>
          );
        })}
      </select>
    </div>
  );
}
