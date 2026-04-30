/**
 * UniversalInputView — pure presentational shell for `UniversalInput` and
 * `UniversalInputControlled`. All Craft-specific behavior is upstream in the
 * state hooks; this component just receives a state bag + handlers + flat
 * configuration props and renders the input row, type selector, autocomplete
 * popover, var picker, and calc dialog.
 *
 * Why split: `UniversalInput` calls `useNode()` which throws when there's no
 * `<NodeProvider>` ancestor. The token editor inside VarPicker needs the same
 * UI without writing to a Craft node, so it uses
 * `UniversalInputControlled`. Both wrappers render this View identically.
 */

import React, { useMemo } from "react";
import { TbBraces, TbBrandTailwind, TbMathFunction } from "react-icons/tb";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";
import { InlineClearButton } from "@/chrome/primitives/InlineClearButton";
import { Chip } from "@/chrome/primitives/Chip";
import { BreakpointChip } from "../../breakpoint-chip/BreakpointChip";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { CalcDialog } from "./CalcDialog";
import { TypeSelector } from "./TypeSelector";
import { UnifiedDropdown } from "./UnifiedDropdown";
import { VarPicker } from "./VarPicker";
import { CSS_UNITS, DesignVar, ValueType } from "./types";

export interface UniversalInputViewProps {
  /** Flat config — same shape callers pass to UniversalInput / Controlled. */
  label?: string;
  labelPrefix?: string;
  labelSuffix?: string;
  labelHide?: boolean;
  labelWidth?: string;
  inputWidth?: string;
  placeholder?: string;
  showVarSelector?: boolean;
  allowedTypes?: ValueType[];
  wrap?: string;
  index?: any;
  propItemKey?: string;
  inline?: boolean;
  propType?: string;
  propKey?: string;
  propTag?: string;
  tailwindKey?: string;
  hideTypeSelector?: boolean;
  /** Render the responsive-class breakpoint pills row. Craft-bound only — the
   *  controlled wrapper passes `false`. */
  renderBreakpointPills?: boolean;

  /** Snapshot of the state hook (Craft-bound or controlled — same shape). */
  state: {
    showAutocomplete: boolean;
    setShowAutocomplete: (v: boolean) => void;
    showCalcDialog: boolean;
    setShowCalcDialog: (v: boolean) => void;
    inputValue: string;
    setInputValue: (v: string) => void;
    selectedType: ValueType;
    setSelectedType: (v: ValueType) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    typeSelectorRef: React.RefObject<HTMLDivElement>;
    currentValue: string;
    organizedOptions: any;
    filteredOptions: string[] | null;
    selectedIndex: number;
    availableTailwindOptions: string[];
    kbdNavActive: boolean;
    handleChange: (value: string, type?: ValueType) => void;
    parsed: { type: ValueType; value: string; numeric?: number };
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    isTypeSelectorOpen: boolean;
    setIsTypeSelectorOpen: (v: boolean) => void;
  };

  /** Handlers built by `useInputHandlers` against the same state. */
  handlers: {
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleInputFocus: () => void;
    handleInputBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleAutocompleteSelect: (option: string) => void;
  };

  /** Design vars — used to humanize var(...) values in the input field. */
  designVars: DesignVar[];
}

export function UniversalInputView({
  label,
  labelPrefix,
  labelSuffix,
  labelHide = false,
  labelWidth = "",
  inputWidth = "",
  placeholder = "Enter value",
  showVarSelector = true,
  allowedTypes,
  wrap = "",
  index = null,
  propItemKey,
  propType = "class",
  propKey,
  propTag,
  tailwindKey,
  hideTypeSelector = false,
  renderBreakpointPills = true,
  state,
  handlers,
  designVars,
}: UniversalInputViewProps) {
  const {
    showAutocomplete,
    setShowAutocomplete,
    showCalcDialog,
    setShowCalcDialog,
    inputValue,
    setInputValue,
    selectedType,
    setSelectedType,
    inputRef,
    typeSelectorRef,
    currentValue,
    organizedOptions,
    filteredOptions,
    selectedIndex,
    availableTailwindOptions,
    kbdNavActive,
    handleChange,
    parsed,
    isEditing,
    setIsEditing,
    isTypeSelectorOpen,
    setIsTypeSelectorOpen,
  } = state;

  const {
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
    handleKeyDown,
    handleAutocompleteSelect,
  } = handlers;

  // Option the keyboard cursor is on — used to highlight the matching button
  // in the grouped (unfiltered) view so arrow-key nav is visible without
  // typing. Only show after the user has actually arrow-keyed.
  const highlightedOption =
    filteredOptions || !kbdNavActive ? undefined : availableTailwindOptions[selectedIndex];

  const availableTypes = useMemo(() => {
    const types: { id: ValueType; label: string | React.ReactNode }[] = [];
    if (!allowedTypes || allowedTypes.includes("calc")) {
      types.push({ id: "calc", label: <TbMathFunction className="size-3" /> });
    }
    types.push({ id: "var", label: <TbBraces className="size-3" /> });
    types.push({ id: "tailwind", label: <TbBrandTailwind className="size-3" /> });
    if (!allowedTypes || allowedTypes.includes("em")) types.push({ id: "em", label: "em" });
    if (!allowedTypes || allowedTypes.includes("px")) types.push({ id: "px", label: "px" });
    if (!allowedTypes || allowedTypes.includes("rem")) types.push({ id: "rem", label: "rem" });
    if (!allowedTypes || allowedTypes.includes("%")) types.push({ id: "%", label: "%" });
    if (!allowedTypes || allowedTypes.includes("vh")) types.push({ id: "vh", label: "vh" });
    if (!allowedTypes || allowedTypes.includes("vw")) types.push({ id: "vw", label: "vw" });
    if (!allowedTypes || allowedTypes.includes("vmin")) types.push({ id: "vmin", label: "vmin" });
    if (!allowedTypes || allowedTypes.includes("vmax")) types.push({ id: "vmax", label: "vmax" });
    return types;
  }, [allowedTypes]);

  // Show human-readable label for tailwind / var values when not actively
  // editing. Matches the dropdown's humanization (e.g. `p-space-sm` → "Space
  // Small", `var(--primary)` → "Primary (Palette)").
  const displayValue = useMemo(() => {
    if (isEditing) return inputValue;
    if (!inputValue) return inputValue;
    // Tailwind class humanization only applies to class-type props (where
    // values are className strings). Skip for `root` / `component` raw-value
    // props and for `controlled` token editing.
    if (propType === "class" && selectedType === "tailwind") {
      return formatTailwindDisplayLabel(inputValue, propTag);
    }
    // Var humanization applies everywhere — matches only the exact
    // `var(--token)` / `font-(--token)` shape and is harmless otherwise.
    if (selectedType === "var") {
      const match = inputValue.match(/^(?:var|font)\s*\(\s*(--[\w-]+)\s*\)$/);
      const varName = match?.[1];
      if (varName) {
        const found = designVars.find(v => v.varName === varName);
        if (found) return found.label;
      }
    }
    return inputValue;
  }, [isEditing, inputValue, selectedType, propType, propTag, designVars]);

  // Refs treated as "inside" by the VarPicker — without these, clicking the
  // text input or re-clicking the type-selector chip would dismiss the picker
  // (DOM-outside) and the input's focus handler would re-open it → flicker.
  const varPickerIgnoreRefs = useMemo(
    () => [inputRef, typeSelectorRef] as const,
    [inputRef, typeSelectorRef]
  );

  const dynamicPlaceholder = useMemo(() => {
    const limitedTypes = ["%", "vh", "vw", "vmin", "vmax"];
    if (selectedType === "calc") return "";
    if (limitedTypes.includes(selectedType)) return ` (${selectedType})`;
    if (CSS_UNITS.includes(selectedType)) return ` (${selectedType})`;
    if (selectedType === "tailwind") return "";
    return placeholder;
  }, [selectedType, placeholder]);

  const onTypeChangeHandler = (type: ValueType) => {
    const oldType = selectedType;
    setShowAutocomplete(false);
    if (type === "calc") {
      setSelectedType("calc");
      setShowCalcDialog(true);
      return;
    }
    setSelectedType(type);
    setIsEditing(type === "tailwind" || type === "var");
    if (type === "tailwind" || type === "var") {
      setShowAutocomplete(true);
    }
    const isOldNumeric = CSS_UNITS.includes(oldType);
    const isNewNumeric = CSS_UNITS.includes(type);
    if (type !== oldType) {
      if (isOldNumeric && isNewNumeric) {
        const numericValue = parsed.numeric?.toString() || "";
        if (numericValue) {
          setInputValue(numericValue);
          handleChange(numericValue, type);
        } else {
          setInputValue("");
        }
      } else {
        setInputValue("");
      }
    }
  };

  const inputBody = (
    <div className="relative min-w-0 flex-1">
      <input
        id={propKey ? `input-${propKey}` : undefined}
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        placeholder={dynamicPlaceholder}
        className="input-plain h-8 w-full"
        aria-label={label || propKey}
        {...toolbarInputNoAutocompleteProps}
      />

      {/* Tailwind autocomplete — only when not in var mode. */}
      {showAutocomplete && !isTypeSelectorOpen && selectedType !== "var" && (
        <UnifiedDropdown
          options={organizedOptions}
          filteredOptions={filteredOptions}
          selectedIndex={selectedIndex}
          onSelect={handleAutocompleteSelect}
          inputRef={inputRef}
          showVarSelector={showVarSelector}
          propTag={propTag}
          tailwindKey={tailwindKey}
          currentValue={currentValue}
          selectedType={selectedType}
          highlightedOption={highlightedOption}
        />
      )}

      {/* Var picker — its own FloatingPanel anchored to the type chip. */}
      {showVarSelector && selectedType === "var" && showAutocomplete && !isTypeSelectorOpen && (
        <VarPicker
          open
          onOpenChange={open => {
            if (!open) {
              setShowAutocomplete(false);
              setIsEditing(false);
            }
          }}
          anchor={typeSelectorRef}
          ignoreOutsideClicks={varPickerIgnoreRefs}
          onSelect={handleAutocompleteSelect}
          currentValue={currentValue}
          propTag={propTag}
          tailwindKey={tailwindKey}
        />
      )}
    </div>
  );

  const typeSelector = !hideTypeSelector ? (
    <TypeSelector
      ref={typeSelectorRef}
      types={availableTypes}
      selectedType={selectedType}
      onCalcClick={() => setShowCalcDialog(true)}
      onOpenChange={open => {
        setIsTypeSelectorOpen(open);
        if (open) {
          setShowAutocomplete(false);
        }
      }}
      onTypeChange={onTypeChangeHandler}
    />
  ) : null;

  const clearButton = currentValue ? (
    <InlineClearButton
      onClick={e => {
        e.preventDefault();
        setInputValue("");
        setIsEditing(false);
        setShowAutocomplete(false);
        handleChange("", selectedType);
      }}
      tooltip="Clear"
    />
  ) : null;

  const row = wrap ? (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      {inputBody}
      {typeSelector}
      {clearButton}
    </div>
  ) : (
    <Chip trailing={clearButton}>
      {inputBody}
      {typeSelector}
    </Chip>
  );

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center gap-0.5">
        {label && !labelHide && (
          <div className={`flex flex-col items-start gap-0.5 ${labelWidth || "w-20"}`}>
            <label
              htmlFor={propKey ? `input-${propKey}` : undefined}
              className="w-full cursor-pointer truncate text-xs whitespace-nowrap"
            >
              {label}
            </label>
            {renderBreakpointPills && propType === "class" && (
              <BreakpointChip
                propKey={propKey}
                propType={propType}
                index={index}
                propItemKey={propItemKey}
                label={propKey}
              />
            )}
          </div>
        )}

        <div className={`flex min-w-0 items-center gap-0.5 ${inputWidth || "flex-1"}`}>{row}</div>
      </div>

      {showCalcDialog && (
        <CalcDialog
          value={selectedType === "calc" ? inputValue : ""}
          onSave={value => {
            handleChange(value, "calc");
            setSelectedType("calc");
            setInputValue(value);
            setShowCalcDialog(false);
            setTimeout(() => setIsEditing(false), 100);
          }}
          onClose={() => setShowCalcDialog(false)}
          anchorEl={typeSelectorRef.current}
        />
      )}
    </div>
  );
}
