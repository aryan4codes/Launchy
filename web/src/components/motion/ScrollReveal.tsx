import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ScrollRevealDirection = "up" | "down" | "left" | "right" | "none";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds before motion starts */
  delay?: number;
  /** Motion duration in seconds */
  duration?: number;
  /** Only animate the first time the element enters view */
  once?: boolean;
  /** Fraction of element visible before triggering (0–1) */
  amount?: number | "some" | "all";
  direction?: ScrollRevealDirection;
  /** Pixel offset for enter animation */
  distance?: number;
  /** Subtle blur → sharp (use sparingly; costs compositor work) */
  blur?: boolean;
};

const easeOut = [0.21, 0.47, 0.32, 0.98] as const;

export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.5,
  once = true,
  amount = 0.2,
  direction = "up",
  distance = 20,
  blur = false,
}: ScrollRevealProps) {
  const reduce = useReducedMotion();

  const offset =
    direction === "none" || reduce
      ? {}
      : {
          up: { y: distance },
          down: { y: -distance },
          left: { x: distance },
          right: { x: -distance },
        }[direction];

  const blurProps =
    blur && !reduce
      ? {
          initial: { opacity: 0, filter: "blur(10px)", ...offset },
          whileInView: { opacity: 1, filter: "blur(0px)", x: 0, y: 0 },
        }
      : {
          initial: { opacity: 0, ...offset },
          whileInView: { opacity: 1, x: 0, y: 0 },
        };

  return (
    <motion.div
      className={cn(className)}
      {...(reduce
        ? {
            initial: { opacity: 1, x: 0, y: 0, filter: "blur(0px)" },
            whileInView: { opacity: 1, x: 0, y: 0, filter: "blur(0px)" },
          }
        : blurProps)}
      viewport={{ once, amount }}
      transition={{
        duration: reduce ? 0 : duration,
        delay: reduce ? 0 : delay,
        ease: easeOut,
      }}
    >
      {children}
    </motion.div>
  );
}

type StaggerRevealProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
  amount?: number | "some" | "all";
};

export function StaggerReveal({
  children,
  className,
  stagger = 0.06,
  delayChildren = 0.05,
  once = true,
  amount = 0.12,
}: StaggerRevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduce ? 0 : stagger,
            delayChildren: reduce ? 0 : delayChildren,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
};

export function StaggerItem({ children, className, distance = 18 }: StaggerItemProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: distance },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: reduce ? 0 : 0.42, ease: easeOut },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
