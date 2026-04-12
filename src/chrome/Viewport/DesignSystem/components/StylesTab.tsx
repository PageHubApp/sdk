import { TbChevronDown, TbChevronRight } from "react-icons/tb";
import { DENSITY_STEPS } from "utils/defaults";
import type { UseDesignSystemReturn } from "../hooks/useDesignSystem";

interface StylesTabProps {
  ds: UseDesignSystemReturn;
}

function CollapsibleSection({
  title,
  section,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  section: string;
  expanded: boolean;
  onToggle: (section: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-base-300 border-b last:border-b-0">
      <button
        onClick={() => onToggle(section)}
        className="bg-neutral hover:bg-neutral/80 flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-neutral-content text-sm font-semibold">{title}</span>
        {expanded ? (
          <TbChevronDown className="text-neutral-content" size={18} />
        ) : (
          <TbChevronRight className="text-neutral-content" size={18} />
        )}
      </button>
      {expanded && <div className="bg-base-100 text-base-content space-y-3 p-3">{children}</div>}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="text-neutral-content mb-1 block text-xs font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border-base-300 bg-base-100 text-base-content focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DensitySlider({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const stepIndex = DENSITY_STEPS.findIndex(s => s.value === value);
  const currentIndex = stepIndex >= 0 ? stepIndex : DENSITY_STEPS.findIndex(s => s.value === "1");
  const currentLabel = DENSITY_STEPS[currentIndex].label;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-neutral-content text-xs font-medium">Spacing Density</label>
        <span className="text-neutral-content text-xs">{currentLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-content text-[10px]">Compact</span>
        <input
          type="range"
          min={0}
          max={DENSITY_STEPS.length - 1}
          step={1}
          value={currentIndex}
          onChange={e => onChange(DENSITY_STEPS[Number(e.target.value)].value)}
          className="bg-border accent-foreground h-1.5 w-full cursor-pointer appearance-none rounded-full"
        />
        <span className="text-neutral-content text-[10px]">Airy</span>
      </div>
    </div>
  );
}

function ColorButton({
  id,
  label,
  value,
  preview,
  buttonRef,
  onClick,
}: {
  id: string;
  label: string;
  value: string;
  preview: string;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onClick: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-neutral-content mb-1 block text-xs font-medium">
        {label}
      </label>
      <button
        id={id}
        ref={buttonRef}
        onClick={onClick}
        className="border-base-300 bg-base-100 text-base-content hover:bg-neutral focus:ring-ring flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus:ring-2 focus:outline-none"
      >
        <div
          className="border-base-300 size-4 rounded-lg border"
          style={{ backgroundColor: preview }}
        />
        <span className="flex-1 truncate">{value}</span>
      </button>
    </div>
  );
}

export function StylesTab({ ds }: StylesTabProps) {
  const {
    styles,
    updateStyle,
    expandedSections,
    toggleSection,
    getColorPreview,
    openStyleColorPicker,
  } = ds;

  return (
    <div className="space-y-0">
      <CollapsibleSection
        title="Spacing & Layout"
        section="spacing"
        expanded={!!expandedSections.spacing}
        onToggle={toggleSection}
      >
        <DensitySlider
          value={styles.spacingDensity}
          onChange={v => updateStyle("spacingDensity", v)}
        />
        <SelectField
          id="ds-content-width"
          label="Content Width"
          value={styles.contentWidth}
          onChange={v => updateStyle("contentWidth", v)}
          options={[
            { value: "48rem", label: "Small (48rem)" },
            { value: "56rem", label: "Medium (56rem)" },
            { value: "64rem", label: "Large (64rem)" },
            { value: "72rem", label: "XL (72rem)" },
            { value: "80rem", label: "2XL (80rem)" },
            { value: "100%", label: "Full Width" },
          ]}
        />
        <SelectField
          id="ds-container-padding"
          label="Page Gutter (x y)"
          value={styles.containerPadding}
          onChange={v => updateStyle("containerPadding", v)}
          options={[
            { value: "1rem 1rem", label: "Small (1rem)" },
            { value: "1.5rem 1.5rem", label: "Medium (1.5rem)" },
            { value: "2rem 2rem", label: "Large (2rem)" },
            { value: "3rem 3rem", label: "XL (3rem)" },
            { value: "2rem 1rem", label: "Wide (2rem x 1rem y)" },
          ]}
        />
        <SelectField
          id="ds-section-gap"
          label="Section Gap"
          value={styles.sectionGap}
          onChange={v => updateStyle("sectionGap", v)}
          options={[
            { value: "0", label: "None" },
            { value: "2rem", label: "Small (2rem)" },
            { value: "3rem", label: "Medium (3rem)" },
            { value: "4rem", label: "Large (4rem)" },
            { value: "6rem", label: "XL (6rem)" },
            { value: "8rem", label: "2XL (8rem)" },
          ]}
        />
        <SelectField
          id="ds-container-gap"
          label="Container Gap"
          value={styles.containerGap}
          onChange={v => updateStyle("containerGap", v)}
          options={[
            { value: "0.5rem", label: "Tight (0.5rem)" },
            { value: "0.75rem", label: "Small (0.75rem)" },
            { value: "1rem", label: "Medium (1rem)" },
            { value: "1.5rem", label: "Large (1.5rem)" },
            { value: "2rem", label: "XL (2rem)" },
          ]}
        />
        <SelectField
          id="ds-button-padding"
          label="Button Padding (x y)"
          value={styles.buttonPadding}
          onChange={v => updateStyle("buttonPadding", v)}
          options={[
            { value: "0.75rem 0.25rem", label: "Small" },
            { value: "1rem 0.5rem", label: "Medium" },
            { value: "1.5rem 0.75rem", label: "Large" },
            { value: "2rem 1rem", label: "XL" },
          ]}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Spatial Scale"
        section="spatial"
        expanded={!!expandedSections.spatial}
        onToggle={toggleSection}
      >
        <SelectField
          id="ds-space-xs"
          label="XS — Icon gaps, tag padding"
          value={styles.spaceXs}
          onChange={v => updateStyle("spaceXs", v)}
          options={[
            { value: "clamp(0.25rem, 0.15rem + 0.26vw, 0.375rem)", label: "Tight" },
            { value: "clamp(0.375rem, 0.25rem + 0.39vw, 0.5rem)", label: "Default" },
            { value: "clamp(0.5rem, 0.375rem + 0.39vw, 0.75rem)", label: "Loose" },
          ]}
        />
        <SelectField
          id="ds-space-sm"
          label="SM — Card items, form fields"
          value={styles.spaceSm}
          onChange={v => updateStyle("spaceSm", v)}
          options={[
            { value: "clamp(0.5rem, 0.375rem + 0.39vw, 0.75rem)", label: "Tight" },
            { value: "clamp(0.75rem, 0.5rem + 0.75vw, 1rem)", label: "Default" },
            { value: "clamp(1rem, 0.75rem + 0.75vw, 1.5rem)", label: "Loose" },
          ]}
        />
        <SelectField
          id="ds-space-md"
          label="MD — Headings, columns"
          value={styles.spaceMd}
          onChange={v => updateStyle("spaceMd", v)}
          options={[
            { value: "clamp(1rem, 0.75rem + 0.75vw, 1.5rem)", label: "Tight" },
            { value: "clamp(1.5rem, 1rem + 1.5vw, 2rem)", label: "Default" },
            { value: "clamp(2rem, 1.5rem + 1.5vw, 3rem)", label: "Loose" },
          ]}
        />
        <SelectField
          id="ds-space-lg"
          label="LG — Section padding"
          value={styles.spaceLg}
          onChange={v => updateStyle("spaceLg", v)}
          options={[
            { value: "clamp(1.5rem, 0.75rem + 2.25vw, 2.5rem)", label: "Tight" },
            { value: "clamp(2.5rem, 1.25rem + 3.75vw, 4rem)", label: "Default" },
            { value: "clamp(3.5rem, 1.75rem + 5.25vw, 6rem)", label: "Loose" },
          ]}
        />
        <SelectField
          id="ds-space-xl"
          label="XL — Heroes, full-bleed CTAs"
          value={styles.spaceXl}
          onChange={v => updateStyle("spaceXl", v)}
          options={[
            { value: "clamp(2.5rem, 1.25rem + 3.75vw, 4rem)", label: "Tight" },
            { value: "clamp(3.5rem, 1.75rem + 5.25vw, 6rem)", label: "Default" },
            { value: "clamp(5rem, 2.5rem + 7.5vw, 8rem)", label: "Loose" },
          ]}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Effects & Borders"
        section="effects"
        expanded={!!expandedSections.effects}
        onToggle={toggleSection}
      >
        <SelectField
          id="ds-radius-box"
          label="Radius Box (cards, containers)"
          value={styles.radiusBox}
          onChange={v => updateStyle("radiusBox", v)}
          options={[
            { value: "0", label: "None" },
            { value: "0.125rem", label: "Small" },
            { value: "0.25rem", label: "Default" },
            { value: "0.375rem", label: "Medium" },
            { value: "0.5rem", label: "Large" },
            { value: "0.75rem", label: "XL" },
            { value: "1rem", label: "2XL" },
            { value: "9999px", label: "Full" },
          ]}
        />
        <SelectField
          id="ds-radius-field"
          label="Radius Field (inputs, selects)"
          value={styles.radiusField}
          onChange={v => updateStyle("radiusField", v)}
          options={[
            { value: "0", label: "None" },
            { value: "0.125rem", label: "Small" },
            { value: "0.25rem", label: "Default" },
            { value: "0.375rem", label: "Medium" },
            { value: "0.5rem", label: "Large" },
            { value: "0.75rem", label: "XL" },
            { value: "9999px", label: "Full" },
          ]}
        />
        <SelectField
          id="ds-radius-selector"
          label="Radius Selector (checkboxes, toggles)"
          value={styles.radiusSelector}
          onChange={v => updateStyle("radiusSelector", v)}
          options={[
            { value: "0", label: "None" },
            { value: "0.125rem", label: "Small" },
            { value: "0.25rem", label: "Default" },
            { value: "0.375rem", label: "Medium" },
            { value: "0.5rem", label: "Large" },
            { value: "0.75rem", label: "XL" },
            { value: "9999px", label: "Full" },
          ]}
        />
        <SelectField
          id="ds-border"
          label="Border Width"
          value={styles.border}
          onChange={v => updateStyle("border", v)}
          options={[
            { value: "0", label: "None" },
            { value: "1px", label: "1px" },
            { value: "2px", label: "2px" },
            { value: "4px", label: "4px" },
          ]}
        />
        <SelectField
          id="ds-shadow-style"
          label="Shadow Style"
          value={styles.shadowStyle}
          onChange={v => updateStyle("shadowStyle", v)}
          options={[
            { value: "shadow-none", label: "None" },
            { value: "shadow-sm", label: "Small" },
            { value: "shadow", label: "Default" },
            { value: "shadow-md", label: "Medium" },
            { value: "shadow-lg", label: "Large" },
            { value: "shadow-xl", label: "XL" },
            { value: "shadow-2xl", label: "2XL" },
          ]}
        />
        <SelectField
          id="ds-depth"
          label="Depth"
          value={styles.depth}
          onChange={v => updateStyle("depth", v)}
          options={[
            { value: "0", label: "Flat" },
            { value: "1", label: "Raised" },
            { value: "2", label: "Elevated" },
          ]}
        />
        <SelectField
          id="ds-noise"
          label="Noise Texture"
          value={styles.noise}
          onChange={v => updateStyle("noise", v)}
          options={[
            { value: "0", label: "Off" },
            { value: "1", label: "On" },
          ]}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Sizing"
        section="sizing"
        expanded={!!expandedSections.sizing}
        onToggle={toggleSection}
      >
        <SelectField
          id="ds-size-field"
          label="Field Size (inputs, buttons)"
          value={styles.sizeField}
          onChange={v => updateStyle("sizeField", v)}
          options={[
            { value: "0.2rem", label: "Small" },
            { value: "0.25rem", label: "Default" },
            { value: "0.3rem", label: "Medium" },
            { value: "0.35rem", label: "Large" },
          ]}
        />
        <SelectField
          id="ds-size-selector"
          label="Selector Size (checkboxes, radios)"
          value={styles.sizeSelector}
          onChange={v => updateStyle("sizeSelector", v)}
          options={[
            { value: "0.2rem", label: "Small" },
            { value: "0.25rem", label: "Default" },
            { value: "0.3rem", label: "Medium" },
            { value: "0.35rem", label: "Large" },
          ]}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Form Inputs"
        section="forms"
        expanded={!!expandedSections.forms}
        onToggle={toggleSection}
      >
        <SelectField
          id="ds-input-padding"
          label="Input Padding"
          value={styles.inputPadding}
          onChange={v => updateStyle("inputPadding", v)}
          options={[
            { value: "0.5rem 0.25rem", label: "Small" },
            { value: "0.75rem 0.5rem", label: "Medium" },
            { value: "1rem 0.5rem", label: "Large" },
            { value: "1rem 0.75rem", label: "XL" },
          ]}
        />
        <ColorButton
          id="ds-input-border-color"
          label="Border Color"
          value={styles.inputBorderColor}
          preview={getColorPreview(styles.inputBorderColor)}
          buttonRef={ds.inputBorderColorButtonRef}
          onClick={() =>
            openStyleColorPicker(ds.inputBorderColorButtonRef, styles.inputBorderColor, v =>
              updateStyle("inputBorderColor", v)
            )
          }
        />
        <ColorButton
          id="ds-input-bg-color"
          label="Background Color"
          value={styles.inputBgColor}
          preview={getColorPreview(styles.inputBgColor)}
          buttonRef={ds.inputBgColorButtonRef}
          onClick={() =>
            openStyleColorPicker(ds.inputBgColorButtonRef, styles.inputBgColor, v =>
              updateStyle("inputBgColor", v)
            )
          }
        />
        <ColorButton
          id="ds-input-text-color"
          label="Text Color"
          value={styles.inputTextColor}
          preview={getColorPreview(styles.inputTextColor)}
          buttonRef={ds.inputTextColorButtonRef}
          onClick={() =>
            openStyleColorPicker(ds.inputTextColorButtonRef, styles.inputTextColor, v =>
              updateStyle("inputTextColor", v)
            )
          }
        />
        <ColorButton
          id="ds-input-placeholder-color"
          label="Placeholder Color"
          value={styles.inputPlaceholderColor}
          preview={getColorPreview(styles.inputPlaceholderColor)}
          buttonRef={ds.inputPlaceholderColorButtonRef}
          onClick={() =>
            openStyleColorPicker(
              ds.inputPlaceholderColorButtonRef,
              styles.inputPlaceholderColor,
              v => updateStyle("inputPlaceholderColor", v)
            )
          }
        />
        <SelectField
          id="ds-input-focus-ring"
          label="Focus Ring Size"
          value={styles.inputFocusRing}
          onChange={v => updateStyle("inputFocusRing", v)}
          options={[
            { value: "0", label: "None" },
            { value: "1px", label: "1px" },
            { value: "2px", label: "2px" },
            { value: "3px", label: "3px (Default)" },
            { value: "4px", label: "4px" },
          ]}
        />
        <ColorButton
          id="ds-input-focus-ring-color"
          label="Focus Ring Color"
          value={styles.inputFocusRingColor}
          preview={getColorPreview(styles.inputFocusRingColor)}
          buttonRef={ds.inputFocusRingColorButtonRef}
          onClick={() =>
            openStyleColorPicker(ds.inputFocusRingColorButtonRef, styles.inputFocusRingColor, v =>
              updateStyle("inputFocusRingColor", v)
            )
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Links"
        section="links"
        expanded={!!expandedSections.links}
        onToggle={toggleSection}
      >
        <ColorButton
          id="ds-link-color"
          label="Link Color"
          value={styles.linkColor}
          preview={getColorPreview(styles.linkColor)}
          buttonRef={ds.linkColorButtonRef}
          onClick={() =>
            openStyleColorPicker(ds.linkColorButtonRef, styles.linkColor, v =>
              updateStyle("linkColor", v)
            )
          }
        />
        <ColorButton
          id="ds-link-hover-color"
          label="Link Hover Color"
          value={styles.linkHoverColor}
          preview={getColorPreview(styles.linkHoverColor)}
          buttonRef={ds.linkHoverColorButtonRef}
          onClick={() =>
            openStyleColorPicker(ds.linkHoverColorButtonRef, styles.linkHoverColor, v =>
              updateStyle("linkHoverColor", v)
            )
          }
        />
        <SelectField
          id="ds-link-underline"
          label="Link Underline"
          value={styles.linkUnderline}
          onChange={v => updateStyle("linkUnderline", v)}
          options={[
            { value: "no-underline", label: "None" },
            { value: "underline", label: "Always" },
            { value: "hover:underline", label: "On Hover" },
          ]}
        />
        <SelectField
          id="ds-link-underline-offset"
          label="Underline Offset"
          value={styles.linkUnderlineOffset}
          onChange={v => updateStyle("linkUnderlineOffset", v)}
          options={[
            { value: "underline-offset-auto", label: "Auto" },
            { value: "underline-offset-1", label: "1px" },
            { value: "underline-offset-2", label: "2px" },
            { value: "underline-offset-4", label: "4px" },
            { value: "underline-offset-8", label: "8px" },
          ]}
        />
      </CollapsibleSection>
    </div>
  );
}
