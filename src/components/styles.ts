// Shared class names for the decisions in DESIGN.md.

export const primaryButton =
  "press rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60";

export const secondaryButton =
  "press rounded-md border border-border bg-surface px-4 py-2 text-sm transition-colors duration-(--duration-fast) hover:bg-background";

export const textButton =
  "text-sm text-muted underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-foreground";

const fieldBase =
  "w-full rounded-sm border border-border px-3 py-2 transition-colors duration-(--duration-fast) placeholder:text-muted/70 focus:border-foreground focus:outline-none";

export const field = `${fieldBase} bg-surface`;

/** A field placed on a surface-colored block. */
export const fieldOnSurface = `${fieldBase} bg-background`;

// Fade in + 4px rise on mount. Height is not animated (DESIGN.md: 모션).
export const enter =
  "transition-[opacity,translate] duration-(--duration-base) ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0";
