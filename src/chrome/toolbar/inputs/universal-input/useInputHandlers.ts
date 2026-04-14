import React from "react";
import { CSS_UNITS, ValueType } from "./types";

interface UseInputHandlersProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  selectedType: ValueType;
  setSelectedType: (type: ValueType) => void;
  setIsEditing: (editing: boolean) => void;
  setShowAutocomplete: (show: boolean) => void;
  setSelectedIndex: (index: number) => void;
  skipBlurCommitRef: React.MutableRefObject<boolean>;
  currentValue: string;
  parsed: { type: ValueType; value: string; numeric?: number };
  availableTailwindOptions: string[];
  showVarSelector: boolean;
  showAutocomplete: boolean;
  filteredOptions: string[] | null;
  selectedIndex: number;
  handleChange: (newValue: string, newType?: ValueType) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const useInputHandlers = (props: UseInputHandlersProps) => {
  const {
    inputValue,
    setInputValue,
    selectedType,
    setSelectedType,
    setIsEditing,
    setShowAutocomplete,
    setSelectedIndex,
    skipBlurCommitRef,
    currentValue,
    parsed,
    availableTailwindOptions,
    showVarSelector,
    showAutocomplete,
    filteredOptions,
    selectedIndex,
    handleChange,
    inputRef,
  } = props;

  // Handle input change with autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const isNumericType = CSS_UNITS.includes(selectedType);

    // AUTO-DETECT UNIT
    const unitMatch = newValue.match(/^(-?[0-9.]+)(px|em|rem|%|vh|vw|vmin|vmax)$/);
    if (unitMatch) {
      const [, numericPart, unit] = unitMatch;
      setSelectedType(unit as ValueType);
      setInputValue(numericPart);
      setIsEditing(true);
      setShowAutocomplete(false);
      return;
    }

    // VALIDATION
    if (isNumericType && newValue !== "") {
      const partialUnitMatch = newValue.match(/^(-?[0-9.]+)([a-z%]*)$/i);

      if (partialUnitMatch) {
        const [, numericPart, suffix] = partialUnitMatch;
        const possibleUnits = ["px", "em", "rem", "%", "vh", "vw", "vmin", "vmax"];
        const isValidPartial =
          suffix === "" ||
          suffix === "%" ||
          possibleUnits.some(unit => unit.startsWith(suffix.toLowerCase()));

        if (isValidPartial) {
          // Allow it
        } else {
          const looksLikeTailwind = newValue.match(/^[a-z]+-/i);
          if (looksLikeTailwind) {
            setSelectedType("tailwind");
            setInputValue(newValue);
            setIsEditing(true);
            setShowAutocomplete(true);
            setSelectedIndex(0);
            return;
          } else {
            return; // Block invalid input
          }
        }
      } else {
        return; // Block invalid input
      }

      // RANGE VALIDATION
      const limitedTypes = ["%", "vh", "vw", "vmin", "vmax"];
      if (limitedTypes.includes(selectedType)) {
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue) && (numValue < -200 || numValue > 1000)) {
          return;
        }
      }
    }

    setInputValue(newValue);
    setIsEditing(true);

    const looksLikeTailwind = newValue.match(/^[a-z]+-/i);
    const isNumeric = /^-?\d+\.?\d*$/.test(newValue);

    if (looksLikeTailwind && selectedType !== "tailwind" && selectedType !== "calc") {
      setSelectedType("tailwind");
      setShowAutocomplete(true);
      setSelectedIndex(0);
    } else if (selectedType === "tailwind") {
      setShowAutocomplete(true);
      setSelectedIndex(0);
    } else if (isNumeric) {
      setShowAutocomplete(false);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsEditing(true);
    if (availableTailwindOptions.length > 0 || showVarSelector) {
      setShowAutocomplete(true);
    }
  };

  // Handle input blur
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if focus is moving to something inside the dropdown
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest("[data-unified-dropdown]")) {
      return;
    }

    setTimeout(() => {
      if (skipBlurCommitRef.current) {
        skipBlurCommitRef.current = false;
        setIsEditing(false);
        setShowAutocomplete(false);
        return;
      }

      if (inputValue !== currentValue) {
        handleChange(inputValue, selectedType);
      }

      setIsEditing(false);
      setShowAutocomplete(false);
    }, 200);
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (option: string) => {
    skipBlurCommitRef.current = true;
    const isDesignVar = option.startsWith("var(");
    setInputValue(option);

    let targetType: ValueType = selectedType;
    if (option === "") {
      targetType = selectedType;
    } else if (isDesignVar) {
      targetType = "calc";
      setSelectedType("calc");
    } else {
      targetType = "tailwind";
      setSelectedType("tailwind");
    }

    handleChange(option, targetType);
    setShowAutocomplete(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete && e.key !== "Enter") return;

    const currentOptions = filteredOptions || availableTailwindOptions;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, currentOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (showAutocomplete && currentOptions[selectedIndex]) {
          handleAutocompleteSelect(currentOptions[selectedIndex]);
        } else {
          handleChange(inputValue || "", selectedType);
          setIsEditing(false);
          setShowAutocomplete(false);
          inputRef.current?.blur();
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowAutocomplete(false);
        setIsEditing(false);
        setInputValue(parsed.numeric?.toString() || parsed.value || currentValue || "");
        inputRef.current?.blur();
        break;
    }
  };

  return {
    handleInputChange,
    handleInputFocus,
    handleInputBlur,
    handleAutocompleteSelect,
    handleKeyDown,
  };
};
