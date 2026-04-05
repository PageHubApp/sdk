// @ts-nocheck
import { motion } from "framer-motion";
import { useState } from "react";

export const DelayedMouseEnter = ({
  delayTime,
  onDelayedMouseEnter = () => {},
  onDelayedMouseLeave = () => {},
  onClick = () => {},
  children,
  ...props
}) => {
  const [timerId, setTimerId] = useState(null);

  const handleDelayedMouseEnter = () => {
    const id = setTimeout(() => {
      onDelayedMouseEnter();
    }, delayTime);
    setTimerId(id);
  };

  const handleDelayedMouseLeave = () => {
    clearTimeout(timerId);
    onDelayedMouseLeave();
  };

  return (
    <motion.button
      onMouseEnter={handleDelayedMouseEnter}
      onMouseLeave={handleDelayedMouseLeave}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default DelayedMouseEnter;
