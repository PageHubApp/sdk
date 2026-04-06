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
      <div className="border-b border-border last:border-b-0">
        <button
          onClick={() => toggleSection("typography")}
          className="flex w-full items-center justify-between bg-muted px-3 py-2 text-left transition-colors hover:bg-muted/80"
          aria-expanded={!!expandedSections.typography}
        >
          <span className="text-sm font-semibold text-muted-foreground">Type</span>
          {expandedSections.typography ? (
            <TbChevronDown className="text-muted-foreground" size={18} />
          ) : (
            <TbChevronRight className="text-muted-foreground" size={18} />
          )}
        </button>
        {expandedSections.typography && (
          <div className="space-y-3 bg-background p-3 text-foreground">
            <div>
              <label htmlFor="ds-heading-font-weight" className="mb-1 block text-xs font-medium text-muted-foreground">
                Heading Font Weight
              </label>
              <select
                id="ds-heading-font-weight"
                value={styles.headingFont}
                onChange={e => updateStyle("headingFont", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="font-normal">Normal</option>
                <option value="font-medium">Medium</option>
                <option value="font-semibold">Semibold</option>
                <option value="font-bold">Bold</option>
                <option value="font-extrabold">Extra Bold</option>
              </select>
            </div>

            <div>
              <label htmlFor="ds-heading-font-family" className="mb-1 block text-xs font-medium text-muted-foreground">
                Heading Font Family
              </label>
              <button
                id="ds-heading-font-family"
                ref={ds.headingFontButtonRef}
                onClick={ds.openHeadingFontPicker}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ fontFamily: styles.headingFontFamily }}
              >
                {styles.headingFontFamily || "Select font..."}
              </button>
            </div>

            <div>
              <label htmlFor="ds-body-font-weight" className="mb-1 block text-xs font-medium text-muted-foreground">
                Body Font Weight
              </label>
              <select
                id="ds-body-font-weight"
                value={styles.bodyFont}
                onChange={e => updateStyle("bodyFont", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              <label htmlFor="ds-body-font-family" className="mb-1 block text-xs font-medium text-muted-foreground">
                Body Font Family
              </label>
              <button
                id="ds-body-font-family"
                ref={ds.bodyFontButtonRef}
                onClick={ds.openBodyFontPicker}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ fontFamily: styles.bodyFontFamily }}
              >
                {styles.bodyFontFamily || "Select font..."}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Fonts Section */}
      <div className="space-y-3 p-6">
        <button
          onClick={ds.addFont}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent"
        >
          <TbPlus size={16} />
          Add Font
        </button>

        {customFonts.map((font, index) => (
          <div key={index} className="group space-y-3 rounded-lg border border-border bg-card p-3">
            {/* Font Name */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={font.name}
                onChange={e => ds.updateFontName(index, e.target.value)}
                className="flex-1 border-b border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-card-foreground hover:border-primary focus:border-ring focus:outline-none"
                placeholder="Font name"
              />
              <button
                onClick={() => ds.deleteFont(index)}
                className="p-1 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                title="Delete font"
              >
                <TbTrash size={16} />
              </button>
            </div>

            {/* Font Properties */}
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label htmlFor={`ds-font-family-${index}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                  Font Family
                </label>
                <button
                  id={`ds-font-family-${index}`}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    ds.setFontDialog({
                      enabled: true,
                      value: font.fontFamily ? [font.fontFamily] : [],
                      originalValue: font.fontFamily ? [font.fontFamily] : [],
                      changed: (value: unknown) => {
                        const fontFamily = Array.isArray(value) ? (value as string[])[0] : value as string;
                        ds.updateFontProperty(index, "fontFamily", fontFamily);
                      },
                      preview: (value: unknown) => {
                        const fontFamily = Array.isArray(value) ? (value as string[])[0] : value as string;
                        ds.updateFontProperty(index, "fontFamily", fontFamily);
                      },
                      e: rect,
                    });
                  }}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1 text-left text-xs text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ fontFamily: font.fontFamily }}
                >
                  {font.fontFamily || "Select font family"}
                </button>
              </div>

              <FontSelect id={`ds-font-size-${index}`} label="Font Size" value={font.fontSize} onChange={v => ds.updateFontProperty(index, "fontSize", v)}
                options={[
                  "0.625rem:XS", "0.75rem:SM", "0.875rem:Base-", "1rem:Base", "1.125rem:LG", "1.25rem:XL",
                  "1.5rem:2XL", "1.875rem:3XL", "2rem:4XL", "2.25rem:4XL+", "3rem:5XL", "3.75rem:6XL", "4.5rem:7XL", "6rem:8XL", "8rem:9XL",
                ]} />
              <FontSelect id={`ds-font-weight-${index}`} label="Font Weight" value={font.fontWeight} onChange={v => ds.updateFontProperty(index, "fontWeight", v)}
                options={["100:Thin", "200:Extra Light", "300:Light", "400:Normal", "500:Medium", "600:Semi Bold", "700:Bold", "800:Extra Bold", "900:Black"]} />
              <FontSelect id={`ds-line-height-${index}`} label="Line Height" value={font.lineHeight} onChange={v => ds.updateFontProperty(index, "lineHeight", v)}
                options={["1:None", "1.15:Tight", "1.2:Snug", "1.25:Compact", "1.375:Normal-", "1.5:Normal", "1.625:Relaxed", "1.75:Loose", "2:Extra"]} />
              <FontSelect id={`ds-letter-spacing-${index}`} label="Letter Spacing" value={font.letterSpacing || "normal"} onChange={v => ds.updateFontProperty(index, "letterSpacing", v)}
                options={["-0.05em:Tighter", "-0.025em:Tight", "normal:Normal", "0.025em:Wide", "0.05em:Wider", "0.1em:Widest"]} />
              <FontSelect id={`ds-text-transform-${index}`} label="Text Transform" value={font.textTransform || "none"} onChange={v => ds.updateFontProperty(index, "textTransform", v)}
                options={["none:None", "uppercase:UPPERCASE", "lowercase:lowercase", "capitalize:Capitalize"]} />
            </div>

            {/* Preview */}
            <div className="rounded-lg bg-muted p-2">
              <div
                style={{
                  fontFamily: font.fontFamily,
                  fontSize: font.fontSize,
                  fontWeight: font.fontWeight,
                  lineHeight: font.lineHeight,
                  letterSpacing: font.letterSpacing || "normal",
                  textTransform: (font.textTransform || "none") as React.CSSProperties["textTransform"],
                }}
                className="text-sm text-muted-foreground"
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={ds.addFont}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent"
        >
          <TbPlus size={16} />
          Add Font
        </button>
      </div>
    </div>
  );
}

/** Compact select for font property grids — options format: "value:Label" */
function FontSelect({
  id, label, value, onChange, options,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map(opt => {
          const [val, lbl] = opt.split(":");
          return <option key={val} value={val}>{`${lbl} (${val})`}</option>;
        })}
      </select>
    </div>
  );
}
