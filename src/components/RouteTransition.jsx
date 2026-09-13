import React from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

// iOS-style push: the outgoing page slides left and fades, the new one slides in from the right.
export default function RouteTransition() {
  const location = useLocation();
  const outlet = useOutlet();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}