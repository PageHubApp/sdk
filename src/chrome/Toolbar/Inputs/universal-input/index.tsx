import React, { useMemo } from "react";
import { TbBraces, TbBrandTailwind, TbMathFunction } from "react-icons/tb";
import { BgWrap, MobileDesktopLabels } from "../../ToolbarStyle";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { CalcDialog } from "./CalcDialog";
import { TypeSelector } from "./TypeSelector";
import { UnifiedDropdown } from "./UnifiedDropdown";
import { CSS_UNITS, UniversalInputProps, ValueType } from "./types";
import { useInputHandlers } from "./useInputHandlers";
import { useUniversalInputState } from "./useUniversalInputState";

// Re-export types for external use
export type { UniversalInputProps, ValueType } from "./types";

export function UniversalInput(props: UniversalInputProps) {
  const {
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
    inline = true,
    propType = "class",
    propKey,
    propTag,
    tailwindKey,
    hideTypeSelector = false,
  } = props;

  // Use custom hooks for state and handlers
  const state = useUniversalInputState(props);
  const handlers = useInputHandlers({
    ...state,
    showVarSelector,
  });

  // Destructure state values for easier access
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
    handleChange,
    parsed,
    isEditing,
    setIsEditing,
    setIsTypeSelectorOpen,
  } = state;

  // Destructure handlers
  const {
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
    handleKeyDown,
    handleAutocompleteSelect,
  } = handlers;

  // Get available types based on restrictions
  const availableTypes = useMemo(() => {
    const types: { id: ValueType; label: string | React.ReactNode }[] = [];
    if (!allowedTypes || allowedTypes.includes("calc")) {
      types.push({ id: "calc", label: <TbMathFunction className="size-3" /> });
    }

    types.push({ id: "var", label: <TbBraces className="size-3" /> });

    types.push({ id: "tailwind", label: <TbBrandTailwind className="size-3" /> });

    if (!allowedTypes || allowedTypes.includes("em")) {
      types.push({ id: "em", label: "em" });
    }

    if (!allowedTypes || allowedTypes.includes("px")) {
      types.push({ id: "px", label: "px" });
    }

    if (!allowedTypes || allowedTypes.includes("rem")) {
      types.push({ id: "rem", label: "rem" });
    }
    if (!allowedTypes || allowedTypes.includes("%")) {
      types.push({ id: "%", label: "%" });
    }
    if (!allowedTypes || allowedTypes.includes("vh")) {
      types.push({ id: "vh", label: "vh" });
    }
    if (!allowedTypes || allowedTypes.includes("vw")) {
      types.push({ id: "vw", label: "vw" });
    }
    if (!allowedTypes || allowedTypes.includes("vmin")) {
      types.push({ id: "vmin", label: "vmin" });
    }
    if (!allowedTypes || allowedTypes.includes("vmax")) {
      types.push({ id: "vmax", label: "vmax" });
    }

    return types;
  }, [allowedTypes]);

  // Dynamic placeholder based on type
  const dynamicPlaceholder = useMemo(() => {
    const limitedTypes = ["%", "vh", "vw", "vmin", "vmax"];

    if (selectedType === "calc") {
      return "";
    } else if (limitedTypes.includes(selectedType)) {
      return ` (${selectedType})`;
    } else if (CSS_UNITS.includes(selectedType)) {
      return ` (${selectedType})`;
    } else if (selectedType === "tailwind") {
      return "";
    }
    return placeholder;
  }, [selectedType, placeholder]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center gap-0.5">
        {/* Label + breakpoint pills */}
        {label && !labelHide && (
          <div className={`flex flex-col items-start gap-0.5 ${labelWidth || "w-20"}`}>
            <label
              htmlFor={`input-${propKey}`}
              className="w-full cursor-pointer truncate text-xs whitespace-nowrap"
            >
              {label}
            </label>
            {propType === "class" && (
              <MobileDesktopLabels
                lab={propKey}
                prefix={labelPrefix}
                suffix={labelSuffix}
                propType={propType}
                propKey={propKey}
                index={index}
                propItemKey={propItemKey}
                icon={null}
                showDeleteIcon={false}
                showVarSelector={false}
                varSelectorPrefix=""
              />
            )}
          </div>
        )}

        {/* Input wrapper */}
        <div className={`flex items-center gap-0.5 ${inputWidth || "flex-1"}`}>
          <BgWrap wrap={wrap}>
            <div className="flex w-full items-center gap-1">
              {/* Main input - always visible */}
              <div className="relative flex-1">
                <input
                  id={`input-${propKey}`}
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  placeholder={dynamicPlaceholder}
                  className="input-plain h-8 w-full"
                  aria-label={label || propKey}
                  {...toolbarInputNoAutocompleteProps}
                />

                {/* Unified dropdown with design vars + grouped options */}
                {showAutocomplete && (
                  <UnifiedDropdown
                    options={organizedOptions}
                    filteredOptions={filteredOptions}
                    selectedIndex={selectedIndex}
                    onSelect={handleAutocompleteSelect}
                    inputRef={inputRef}
                    showVarSelector={showVarSelector}
                    propTag={propTag}
                    tailwindKey={tailwindKey}
                    searchValue={inputValue}
                    currentValue={currentValue}
                    selectedType={selectedType}
                  />
                )}
              </div>

              {/* Type selector */}
              {!hideTypeSelector && (
                <TypeSelector
                  ref={typeSelectorRef}
                  types={availableTypes}
                  selectedType={selectedType}
                  onCalcClick={() => setShowCalcDialog(true)}
                  onOpenChange={setIsTypeSelectorOpen}
                  onTypeChange={type => {
                    const oldType = selectedType;

                    // If calc is selected from dropdown, open the calc dialog
                    if (type === "calc") {
                      setSelectedType("calc");
                      setShowCalcDialog(true);
                      return;
                    }

                    setSelectedType(type);
                    setIsEditing(false); // Exit editing mode when switching types

                    if (type === "tailwind" || type === "var") {
                      setShowAutocomplete(true);
                    }

                    const isOldNumeric = CSS_UNITS.includes(oldType);
                    const isNewNumeric = CSS_UNITS.includes(type);

                    // When changing type, handle differently based on what kind of types
                    if (type !== oldType) {
                      if (isOldNumeric && isNewNumeric) {
                        // Numeric to numeric: keep the number, just change unit
                        const numericValue = parsed.numeric?.toString() || "";
                        if (numericValue) {
                          setInputValue(numericValue);
                          handleChange(numericValue, type);
                        } else {
                          setInputValue("");
                          // Don't call handleChange with empty - just clear locally
                        }
                      } else if (isNewNumeric && !isOldNumeric) {
                        // Text to numeric: clear input, let user type the number
                        setInputValue("");
                        // Don't save empty value - just clear the input and wait for user to type
                      } else if (!isNewNumeric && isOldNumeric) {
                        // Numeric to text (tailwind/calc): clear input
                        setInputValue("");
                        // Don't save empty value - wait for user input
                      } else {
                        // Text to text (tailwind <-> calc): clear
                        setInputValue("");
                        // Don't save empty value - wait for user input
                      }
                    }
                  }}
                />
              )}
            </div>
          </BgWrap>
        </div>
      </div>

      {/* Calc Dialog */}
      {showCalcDialog && (
        <CalcDialog
          value={selectedType === "calc" ? inputValue : ""}
          onSave={value => {
            handleChange(value, "calc");
            setSelectedType("calc");
            setInputValue(value);
            // Don't set isEditing(false) immediately to avoid race condition with prop updates
            setShowCalcDialog(false);
            // Let the input blur naturally or wait for prop sync
            setTimeout(() => setIsEditing(false), 100);
          }}
          onClose={() => setShowCalcDialog(false)}
          anchorEl={typeSelectorRef.current}
        />
      )}
    </div>
  );
}
