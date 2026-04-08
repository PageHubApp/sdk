import React, { useState } from "react";
import { TbCheck, TbDeviceFloppy, TbLoader2 } from "react-icons/tb";

interface AnimatedSaveButtonProps {
  onClick: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

type SaveState = "idle" | "loading" | "success";

export function AnimatedSaveButton({
  onClick,
  disabled = false,
  className = "",
}: AnimatedSaveButtonProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async () => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    setSaveState("loading");

    try {
      await onClick();

      // Ensure minimum loading time of 500ms
      await new Promise(resolve => setTimeout(resolve, 500));

      setSaveState("success");

      // Show success state for 5 seconds, then reset
      setTimeout(() => {
        setSaveState("idle");
        setIsAnimating(false);
      }, 5000);
    } catch (error) {
      console.error("Save failed:", error);
      // On error, reset immediately
      setSaveState("idle");
      setIsAnimating(false);
    }
  };

  const getIcon = () => {
    switch (saveState) {
      case "loading":
        return <TbLoader2 className="animate-spin" />;
      case "success":
        return <TbCheck />;
      default:
        return <TbDeviceFloppy />;
    }
  };

  const getButtonClasses = () => {
    const baseClasses = `cursor-pointer hover:bg-neutral hover:text-base-content py-3 px-1.5 text-xl flex items-center justify-center rounded-lg text-base-content transition-colors duration-200 ${className}`;

    if (disabled || isAnimating) {
      return `${baseClasses} opacity-50`;
    }

    return baseClasses;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${getButtonClasses()} active:scale-90`}
    >
      {getIcon()}
    </button>
  );
}
