/**
 * Enhanced accessibility utilities for PageHub
 * Provides comprehensive accessibility features and utilities
 */

/**
 * Extracts accessibility-related props from component props
 * and returns them as DOM attributes
 */
export const getAccessibilityProps = (props: any) => {
  const accessibilityProps: any = {};

  // ARIA Labels
  if (props.ariaLabel) accessibilityProps["aria-label"] = props.ariaLabel;
  if (props.ariaDescribedBy) accessibilityProps["aria-describedby"] = props.ariaDescribedBy;
  if (props.ariaLabelledBy) accessibilityProps["aria-labelledby"] = props.ariaLabelledBy;

  // ARIA States
  if (props.ariaExpanded !== undefined) accessibilityProps["aria-expanded"] = props.ariaExpanded;
  if (props.ariaSelected !== undefined) accessibilityProps["aria-selected"] = props.ariaSelected;
  if (props.ariaChecked !== undefined) accessibilityProps["aria-checked"] = props.ariaChecked;
  if (props.ariaPressed !== undefined) accessibilityProps["aria-pressed"] = props.ariaPressed;
  if (props.ariaDisabled !== undefined) accessibilityProps["aria-disabled"] = props.ariaDisabled;
  if (props.ariaRequired !== undefined) accessibilityProps["aria-required"] = props.ariaRequired;
  if (props.ariaInvalid !== undefined) accessibilityProps["aria-invalid"] = props.ariaInvalid;

  // ARIA Roles
  if (props.role) accessibilityProps.role = props.role;

  // Keyboard Navigation
  if (props.tabIndex !== undefined) accessibilityProps.tabIndex = props.tabIndex;
  if (props.ariaHidden !== undefined) accessibilityProps["aria-hidden"] = props.ariaHidden;

  // Live Regions
  if (props.ariaLive) accessibilityProps["aria-live"] = props.ariaLive;
  if (props.ariaAtomic !== undefined) accessibilityProps["aria-atomic"] = props.ariaAtomic;

  // Additional ARIA properties
  if (props.ariaControls) accessibilityProps["aria-controls"] = props.ariaControls;
  if (props.ariaOwns) accessibilityProps["aria-owns"] = props.ariaOwns;
  if (props.ariaHaspopup) accessibilityProps["aria-haspopup"] = props.ariaHaspopup;
  if (props.ariaModal) accessibilityProps["aria-modal"] = props.ariaModal;

  return accessibilityProps;
};

/**
 * Merges accessibility props with existing props, giving priority to accessibility props
 */
export const mergeAccessibilityProps = (existingProps: any, componentProps: any) => {
  const accessibilityProps = getAccessibilityProps(componentProps);

  return {
    ...existingProps,
    ...accessibilityProps,
  };
};

/**
 * Color contrast utilities
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if color combination meets WCAG contrast requirements
 */
export const meetsWCAGContrast = (
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA"
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = level === "AA" ? 4.5 : 7;
  return ratio >= minRatio;
};

/**
 * Generate accessible color variants
 */
export const generateAccessibleColors = (baseColor: string) => {
  // This is a simplified version - in practice, you'd want to use a proper color library
  return {
    base: baseColor,
    light: `${baseColor}20`, // 20% opacity
    medium: `${baseColor}60`, // 60% opacity
    dark: `${baseColor}CC`, // 80% opacity
  };
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Trap focus within an element
   */
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      element.removeEventListener("keydown", handleTabKey);
    };
  },

  /**
   * Restore focus to previously focused element
   */
  restoreFocus: (element: HTMLElement) => {
    element.focus();
  },
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Announce text to screen readers
   */
  announce: (text: string, priority: "polite" | "assertive" = "polite") => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = text;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  /**
   * Hide element from screen readers
   */
  hideFromScreenReader: (element: HTMLElement) => {
    element.setAttribute("aria-hidden", "true");
  },

  /**
   * Show element to screen readers
   */
  showToScreenReader: (element: HTMLElement) => {
    element.removeAttribute("aria-hidden");
  },
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNavigation = {
  /**
   * Handle arrow key navigation for lists
   */
  handleArrowKeys: (event: KeyboardEvent, items: HTMLElement[], currentIndex: number) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        newIndex = (currentIndex + 1) % items.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      items[newIndex].focus();
      return newIndex;
    }

    return currentIndex;
  },

  /**
   * Handle Enter and Space key activation
   */
  handleActivation: (event: KeyboardEvent, callback: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  },
};

/**
 * Motion and animation utilities
 */
export const motion = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  /**
   * Apply motion-safe styles
   */
  applyMotionSafeStyles: (element: HTMLElement, styles: Record<string, string>) => {
    if (motion.prefersReducedMotion()) {
      // Remove or reduce motion-related styles
      const motionSafeStyles = { ...styles };
      delete motionSafeStyles.transition;
      delete motionSafeStyles.animation;
      delete motionSafeStyles.transform;

      Object.assign(element.style, motionSafeStyles);
    } else {
      Object.assign(element.style, styles);
    }
  },
};

/**
 * High contrast mode utilities
 */
export const highContrast = {
  /**
   * Check if user prefers high contrast
   */
  prefersHighContrast: (): boolean => {
    return window.matchMedia("(prefers-contrast: high)").matches;
  },

  /**
   * Apply high contrast styles
   */
  applyHighContrastStyles: (element: HTMLElement) => {
    if (highContrast.prefersHighContrast()) {
      element.style.border = "2px solid";
      element.style.outline = "2px solid";
    }
  },
};

export default {
  getAccessibilityProps,
  mergeAccessibilityProps,
  getContrastRatio,
  meetsWCAGContrast,
  generateAccessibleColors,
  focusManagement,
  screenReader,
  keyboardNavigation,
  motion,
  highContrast,
};
