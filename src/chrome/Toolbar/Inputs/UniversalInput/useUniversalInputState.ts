import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { AllStyles, TailwindStyles } from "utils/tailwind";
import { ViewAtom } from "../../../Viewport/atoms";
import { changeProp, getProp, getPropFinalValue } from "../../../Viewport/lib";
import { getEffectiveViews, ViewSelectionAtom } from "../../Label";
import { CSS_UNITS, UniversalInputProps, ValueType } from "./types";
import { formatValue, parseValue } from "./utils";

export const useUniversalInputState = (props: UniversalInputProps) => {
  const {
    propKey,
    propType = "class",
    propTag = "",
    allowedTypes,
    tailwindOptions,
    tailwindKey,
    index = null,
    propItemKey,
    onChange = null,
    overrideType,
  } = props;

  // Get current view for responsive styles
  const view = useAtomValue(ViewAtom);
  const viewSelection = useAtomValue(ViewSelectionAtom);
  const classDark = viewSelection.dark ?? false;

  // Get node and props from Craft.js
  const {
    actions: { setProp },
    propValue,
    id,
  } = useNode(node => {
    let value;
    const nodeProps = node.data.props || {};

    if (propType === "class") {
      value = getPropFinalValue(
        { propKey, propType, propItemKey, index },
        view,
        nodeProps,
        classDark
      ).value;
    } else {
      // root / component / etc. — must read from props.root (not top-level props[propKey])
      value = getProp({ propKey, propType, propItemKey, index }, view, nodeProps);
    }

    return {
      propValue: value,
      id: node.id,
    };
  });

  const { query, actions } = useEditor();

  // Local state for input management
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showCalcDialog, setShowCalcDialog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeSelectorRef = useRef<HTMLDivElement>(null);
  const skipBlurCommitRef = useRef(false);
  const pendingUpdateRef = useRef(false);

  // Get current value from props
  const currentValue = propValue || "";

  // Parse current value
  const parsed = useMemo(() => parseValue(currentValue, propTag), [currentValue, propTag]);

  // Default to tailwind if allowed, otherwise px
  const defaultType =
    !allowedTypes || allowedTypes.includes("tailwind") ? "tailwind" : allowedTypes[0] || "px";
  const [selectedType, setSelectedType] = useState<ValueType>(defaultType);

  // Sync override type from master selector
  useEffect(() => {
    if (overrideType && !currentValue) {
      setSelectedType(overrideType);
    }
  }, [overrideType]);

  // Update selected type when value changes (but only if there's actually a value)
  useEffect(() => {
    if (currentValue) {
      setSelectedType(parsed.type);
    } else if (overrideType) {
      setSelectedType(overrideType);
    }
  }, [parsed.type, currentValue, overrideType]);

  // Update input value when currentValue changes externally (but not while editing)
  useEffect(() => {
    const inputIsFocused = document.activeElement === inputRef.current;

    if (pendingUpdateRef.current && currentValue) {
      pendingUpdateRef.current = false;
    }

    if (isEditing || inputIsFocused || pendingUpdateRef.current) {
      return;
    }
    switch (parsed.type) {
      case "tailwind":
        setInputValue(parsed.value);
        break;
      case "var":
        setInputValue(parsed.value);
        break;
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

  // Get available Tailwind options
  const availableTailwindOptions = useMemo(() => {
    if (tailwindOptions) return tailwindOptions;
    if (tailwindKey && TailwindStyles[tailwindKey]) {
      return TailwindStyles[tailwindKey];
    }
    if (propTag) {
      return AllStyles.filter(
        style => typeof style === "string" && style.startsWith(`${propTag}-`)
      );
    }
    return [];
  }, [tailwindOptions, tailwindKey, propTag]);

  // Organize Tailwind options into groups
  const organizedOptions = useMemo(() => {
    if (!availableTailwindOptions.length) return null;

    const prefix = propTag || availableTailwindOptions[0]?.split("-")[0] || "";
    const groups = {
      named: [] as string[],
      numeric: [] as string[],
      fractions: [] as string[],
      other: [] as string[],
    };

    // Special handling for cursor: split into popular (named) and other
    if (propTag === "cursor" || propKey === "cursor") {
      const popularCursors = [
        "cursor-auto",
        "cursor-default",
        "cursor-pointer",
        "cursor-wait",
        "cursor-text",
        "cursor-move",
        "cursor-not-allowed",
        "cursor-grab",
        "cursor-grabbing",
      ];

      availableTailwindOptions.forEach(option => {
        if (popularCursors.includes(option)) {
          groups.named.push(option);
        } else {
          groups.other.push(option);
        }
      });

      return groups;
    }

    availableTailwindOptions.forEach(option => {
      const value = option.replace(`${prefix}-`, "");

      // If option has no prefix (value unchanged), it's a keyword — treat as named
      const hasNoPrefix = value === option;

      if (hasNoPrefix || ["full", "screen", "auto", "min", "max", "fit", "none"].includes(value)) {
        groups.named.push(option);
      } else if (value.includes("/")) {
        groups.fractions.push(option);
      } else if (/^[\d.]+$/.test(value) || value === "px") {
        groups.numeric.push(option);
      } else {
        groups.other.push(option);
      }
    });

    return groups;
  }, [availableTailwindOptions, propTag, propKey]);

  // Get filtered options based on search
  const filteredOptions = useMemo(() => {
    if (!inputValue || !isEditing || inputValue === currentValue || inputValue === parsed.value) {
      return null;
    }

    const search = inputValue.toLowerCase();
    return availableTailwindOptions.filter(option => option.toLowerCase().includes(search));
  }, [inputValue, availableTailwindOptions, isEditing, currentValue, parsed.value]);

  // Handle value change
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

    if (detectedType !== selectedType) {
      setSelectedType(detectedType);
    }

    const formatted = formatValue(processedValue, detectedType, propTag);
    pendingUpdateRef.current = true;

    if (propType === "class") {
      const effectiveViews = getEffectiveViews(viewSelection, view);
      effectiveViews.forEach(targetView => {
        changeProp({
          setProp,
          propKey,
          value: formatted,
          propType,
          view: targetView,
          index,
          propItemKey,
          onChange,
          query,
          actions,
          nodeId: id,
          classDark,
        });
      });
    } else {
      changeProp({
        setProp,
        propKey,
        value: formatted,
        propType,
        view,
        index,
        propItemKey,
        onChange,
        query,
        actions,
        nodeId: id,
      });
    }

    setTimeout(() => {
      if (pendingUpdateRef.current) {
        pendingUpdateRef.current = false;
      }
    }, 500);
  };

  return {
    // State
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
    isTypeSelectorOpen,
    setIsTypeSelectorOpen,
    selectedType,
    setSelectedType,

    // Refs
    inputRef,
    typeSelectorRef,
    skipBlurCommitRef,
    pendingUpdateRef,

    // Computed values
    currentValue,
    parsed,
    availableTailwindOptions,
    organizedOptions,
    filteredOptions,

    // Handlers
    handleChange,

    // CraftJS data
    id,
    view,
    viewSelection,
    query,
    actions,
  };
};
