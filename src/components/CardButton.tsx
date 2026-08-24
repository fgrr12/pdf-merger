import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Botoncito que aparece al pasar el mouse por una tarjeta. */
export function CardButton({
  label,
  danger,
  children,
  ...rest
}: { label: string; danger?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        "grid h-7 w-7 place-items-center rounded-lg bg-black/55 text-white backdrop-blur-xs transition",
        "hover:bg-black/75 disabled:opacity-30 disabled:hover:bg-black/55",
        "focus-visible:outline-2 focus-visible:outline-white",
        danger ? "hover:bg-rose-600" : "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
