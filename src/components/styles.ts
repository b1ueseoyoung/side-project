// Shared class names for the decisions in DESIGN.md.

export const primaryButton =
  "press inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50";

export const secondaryButton =
  "press inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-hover";

export const textButton =
  "text-sm font-medium text-muted underline-offset-4 transition-colors duration-(--duration-fast) hover:text-foreground hover:underline";

export const field =
  "w-full rounded-md border border-border bg-surface px-4 py-3 transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none";

export const card = "rounded-lg bg-surface";

export const tag = "rounded-sm bg-fill-strong px-1.5 py-0.5 text-xs font-semibold text-secondary";

export const container = "mx-auto w-full max-w-2xl px-4 sm:px-6";

// Fade in + 4px rise on mount. Height is not animated (DESIGN.md: 모션).
export const enter =
  "transition-[opacity,translate] duration-(--duration-base) ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0";
