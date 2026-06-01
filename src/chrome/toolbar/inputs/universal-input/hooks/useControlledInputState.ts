/**
 * useControlledInputState — mirror of `useUniversalInputState` for the
 * controlled (no CraftJS) variant. Used by `UniversalInputControlled`, which
 * is rendered in the VarPicker editor where there is no selected node.
 *
 * Differences from the Craft-bound state hook:
 * - Skips `useNode()` / `useEditor()` / responsive-view atoms — the controlled
 *   variant doesn't write to a node and doesn't deal with responsive scoping.
 * - `currentValue` is sourced from the `value` prop; `handleChange` calls the
 *   `onChange` prop with a formatted CSS string.
 * - Returns the subset of `useUniversalInputState`'s shape that
 *   `UniversalInputView` + `useInputHandlers` actually consume, so the View can
 *   render either hook without branching. The Craft-only fields (`id`, `view`,
 *   `modifiers`, `multiScope`, `query`, `actions`) aren't part of that subset,
 *   so the controlled variant simply omits them.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AllStyles, TailwindStyles } from "../../../../../utils/tailwind/tailwind";
import { isDesignTokenClass } from "../designTokens";
import { CSS_UNITS, ValueType } from "../types";
import { formatValue, parseValue } from "../utils";

export interface UseControlledInputStateProps {
  value: string;
  onChange: (value: string) => void;
  propTag?: string;
  tailwindKey?: string;
  tailwindOptions?: string[];
  allowedTypes?: ValueType[];
  overrideType?: ValueType;
}

export const useControlledInputState = (props: UseControlledInputStateProps) => {
  const {
    value,
    onChange,
    propTag = "",
    tailwindKey,
    tailwindOptions,
    allowedTypes,
    overrideType,
  } = props;

  // Local state mirrors the Craft-bound hook 1:1.
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showCalcDialog, setShowCalcDialog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [kbdNavActive, setKbdNavActive] = useState(false);
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeSelectorRef = useRef<HTMLDivElement>(null);
  const skipBlurCommitRef = useRef(false);
  const pendingUpdateRef = useRef(false);

  const currentValue = value || "";
  const parsed = useMemo(() => parseValue(currentValue, propTag), [currentValue, propTag]);

  const defaultType =
    !allowedTypes || allowedTypes.includes("tailwind") ? "tailwind" : allowedTypes[0] || "px";
  const [selectedType, setSelectedType] = useState<ValueType>(defaultType);

  useEffect(() => {
    if (overrideType && !currentValue) {
      setSelectedType(overrideType);
    }
  }, [overrideType]);

  useEffect(() => {
    if (currentValue) {
      setSelectedType(parsed.type);
    } else if (overrideType) {
      setSelectedType(overrideType);
    }
  }, [parsed.type, currentValue, overrideType]);

  useEffect(() => {
    const inputIsFocused = document.activeElement === inputRef.current;
    if (pendingUpdateRef.current && currentValue) pendingUpdateRef.current = false;
    if (isEditing || inputIsFocused || pendingUpdateRef.current) return;
    switch (parsed.type) {
      case "tailwind":
      case "var":
      case "calc":
        setInputValue(parsed.value);
        break;
      case "px":
      case "em":
      case "rem":
      case "%":
      case "vh":
      case "vw":
      case "vmin":
      case "vmax":
        setInputValue(parsed.numeric?.toString() || parsed.value);
        break;
      default:
        setInputValue(currentValue || "");
    }
  }, [currentValue, parsed, isEditing]);

  const availableTailwindOptions = useMemo(() => {
    if (tailwindOptions) return tailwindOptions;
    if (tailwindKey && TailwindStyles[tailwindKey]) return TailwindStyles[tailwindKey];
    if (propTag) {
      return AllStyles.filter(
        style => typeof style === "string" && style.startsWith(`${propTag}-`)
      );
    }
    return [];
  }, [tailwindOptions, tailwindKey, propTag]);

  const organizedOptions = useMemo(() => {
    if (!availableTailwindOptions.length) return null;
    const prefix = propTag || availableTailwindOptions[0]?.split("-")[0] || "";
    const groups = {
      named: [] as string[],
      numeric: [] as string[],
      fractions: [] as string[],
      tokens: [] as string[],
      other: [] as string[],
    };
    availableTailwindOptions.forEach(option => {
      const v = option.replace(`${prefix}-`, "");
      const hasNoPrefix = v === option;
      if (isDesignTokenClass(option, prefix)) {
        groups.tokens.push(option);
      } else if (
        hasNoPrefix ||
        ["full", "screen", "auto", "min", "max", "fit", "none"].includes(v)
      ) {
        groups.named.push(option);
      } else if (v.includes("/")) {
        groups.fractions.push(option);
      } else if (/^[\d.]+$/.test(v) || v === "px") {
        groups.numeric.push(option);
      } else {
        groups.other.push(option);
      }
    });
    return groups;
  }, [availableTailwindOptions, propTag]);

  const filteredOptions = useMemo(() => {
    if (!inputValue || !isEditing || inputValue === currentValue || inputValue === parsed.value) {
      return null;
    }
    const search = inputValue.toLowerCase();
    return availableTailwindOptions.filter(option => option.toLowerCase().includes(search));
  }, [inputValue, availableTailwindOptions, isEditing, currentValue, parsed.value]);

  const handleChange = (newValue: string, newType?: ValueType) => {
    const typeToUse = newType || selectedType;
    let detectedType = typeToUse;
    let processedValue = newValue;

    if (!newType && newValue && typeToUse !== "calc" && typeToUse !== "tailwind") {
      if (newValue.endsWith("%")) {
        detectedType = "%";
        processedValue = newValue.slice(0, -1);
      } else {
        for (const unit of CSS_UNITS) {
          if (unit !== "%" && newValue.endsWith(unit)) {
            detectedType = unit;
            processedValue = newValue.slice(0, -unit.length);
            break;
          }
        }
      }
    }

    if (detectedType !== selectedType) setSelectedType(detectedType);

    const formatted = formatValue(processedValue, detectedType, propTag);
    pendingUpdateRef.current = true;
    onChange(formatted);

    setTimeout(() => {
      if (pendingUpdateRef.current) pendingUpdateRef.current = false;
    }, 500);
  };

  return {
    showAutocomplete,
    setShowAutocomplete,
    showCalcDialog,
    setShowCalcDialog,
    inputValue,
    setInputValue,
    isEditing,
    setIsEditing,
    selectedIndex,
    setSelectedIndex,
    kbdNavActive,
    setKbdNavActive,
    isTypeSelectorOpen,
    setIsTypeSelectorOpen,
    selectedType,
    setSelectedType,

    inputRef,
    typeSelectorRef,
    skipBlurCommitRef,
    pendingUpdateRef,

    currentValue,
    parsed,
    availableTailwindOptions,
    organizedOptions,
    filteredOptions,

    handleChange,
  };
};
