import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default spacing scale. The design system adds named steps (`px-wide`,
 * `gap-base`...), so without them a later `p-0` would not replace an earlier `px-wide` and both would apply.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ["none", "tightest", "tighter", "tight", "base", "wide", "wider", "widest"],
    },
  },
});

/**
 * Smart merge class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Merge class names + merge optimize Tailwind classes
 */
export function cnm(...input: ClassValue[]) {
  return twMerge(cn(input));
}
