// @ts-nocheck
import { Tooltip } from "components/layout/Tooltip";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

export const AnimatedButton = ({ children, className = "", ariaLabel = "", ...props }) => (
  <div className="h-8">
    <motion.button
      onClick={props.onClick}
      key={uuidv4()}
      className={`${className} origin-top cursor-pointer`}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.9 }}
      initial={{
        scale: 0,
        opacity: 0,
        // x: -100,
        // y: -48,
        //  width: 0,
        //  height: 0,
      }}
      animate={{
        scale: 1,
        opacity: 1,
        // x: 0,
        y: 0,
        // width: "24px",
        //  height: "24px",
        transition: { delay: 0.3 },
      }}
      exit={{
        scale: 0,
        opacity: 0,
        // y: -24,
        transition: { type: "spring", duration: 0.3 },
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 20,
      }}
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {children}
    </motion.button>
  </div>
);

export const AnimatedTooltipButton = ({
  content,
  placement = "bottom",
  children,
  className = "flex h-8 w-8 flex-row items-center justify-center gap-3 rounded-full border border-border bg-primary text-base text-primary-foreground shadow-inner transition-colors hover:bg-primary",
  ...props
}) => (
  <Tooltip content={content} placement={placement}>
    <AnimatedButton {...props} className={className} ariaLabel={content}>
      {children}
    </AnimatedButton>
  </Tooltip>
);

export default AnimatedButton;
