import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "soft" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-violet-600 text-white shadow-lg shadow-violet-600/25 hover:bg-violet-500 active:bg-violet-700",
  soft: "bg-zinc-900/5 text-zinc-700 hover:bg-zinc-900/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15",
  ghost:
    "text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Botón grande, para la acción principal. */
  big?: boolean;
};

export function Button({ variant = "soft", big, className = "", ...rest }: Props) {
  return (
    <button
      className={[
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium",
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
        "disabled:pointer-events-none disabled:opacity-40",
        big ? "h-11 px-5 text-sm" : "h-9 px-3 text-[13px]",
        VARIANTS[variant],
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
