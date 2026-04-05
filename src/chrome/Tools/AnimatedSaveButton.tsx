// @ts-nocheck
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import { TbCheck, TbDeviceFloppy, TbLoader2 } from "react-icons/tb";

interface AnimatedSaveButtonProps {
  onClick: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

type SaveState = "idle" | "loading" | "success";

export const AnimatedSaveButton: React.FC<AnimatedSaveButtonProps> = ({
  onClick,
  disabled = false,
  className = "",
}) => {
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
    const baseClasses = `cursor-pointer hover:bg-muted hover:text-foreground py-3 px-1.5 text-xl flex items-center justify-center rounded-lg text-foreground transition-colors duration-200 ${className}`;

    if (disabled || isAnimating) {
      return `${baseClasses} opacity-50`;
    }

    return baseClasses;
  };

  return (
    <motion.div
      onClick={handleClick}
      className={getButtonClasses()}
      whileTap={!disabled && !isAnimating ? { scale: 0.9 } : {}}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={saveState}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {getIcon()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
