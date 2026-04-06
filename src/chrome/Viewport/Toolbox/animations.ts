export const menuItemVariants = {
  hidden: {
    x: -100,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.2,
      type: "spring",
      stiffness: 100,
      damping: 10,
      mass: 0.5,
    },
  },
};

export const subMenuItemVariants = {
  hidden: {
    x: -150,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    },
  },
  visible: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    },
  },
};

export const activeMenuContainerVariants = {
  hidden: {
    scale: 0,
    opacity: 0,
    x: -420,
    //  y: -2,
  },
  visible: {
    //  y: 0,
    scale: 1,
    x: 0,
    // width: "unset",
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 20,
      mass: 0.5,
    },
  },
};

export const containerVariants = {
  hidden: {
    height: 0,
    width: 0,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    },
  },
  visible: {
    height: "unset",
    width: "unset",
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    },
  },
};

export const iconVariants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
  hidden: {
    transition: {
      staggerChildren: 0.1,
      staggerDirection: -1,
    },
  },
};
