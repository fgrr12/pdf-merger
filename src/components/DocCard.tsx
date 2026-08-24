import type { Doc } from "../types";
import { formatSize } from "../lib/files";
import { Alert, ChevronLeft, ChevronRight, X } from "./Icons";

type Props = {
  doc: Doc;
  index: number;
  total: number;
  isDragging: boolean;
  isOver: boolean;
  onRemove: () => void;
  onMove: (to: number) => void;
};

export function DocCard({ doc, index, total, isDragging, isOver, onRemove, onMove }: Props) {
  const subtitle = doc.error
    ? "No se pudo leer"
    : doc.loading
      ? "Leyendo…"
      : `${doc.pages} ${doc.pages === 1 ? "página" : "páginas"} · ${formatSize(doc.size)}`;

  return (
    <div
      className={[
        "group relative flex flex-col overflow-hidden rounded-xl border bg-white transition",
        "dark:bg-zinc-900",
        doc.error
          ? "border-rose-300 dark:border-rose-500/40"
          : "border-zinc-200 dark:border-white/10",
        isDragging ? "opacity-30" : "shadow-sm hover:shadow-lg hover:-translate-y-0.5",
        isOver ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950" : "",
      ].join(" ")}
    >
      <div className="relative aspect-3/4 cursor-grab overflow-hidden bg-zinc-100 active:cursor-grabbing dark:bg-zinc-800">
        {doc.thumb ? (
          <img
            src={doc.thumb}
            alt=""
            draggable={false}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            {doc.error ? (
              <Alert className="h-7 w-7 text-rose-400" />
            ) : (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-500 dark:border-zinc-700 dark:border-t-violet-400" />
            )}
          </div>
        )}

        <span className="pointer-events-none absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-violet-600 px-1.5 text-xs font-semibold tabular-nums text-white shadow-md">
          {index + 1}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <div className="flex gap-1">
            <IconBtn
              label="Mover antes"
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              <ChevronLeft />
            </IconBtn>
            <IconBtn
              label="Mover después"
              disabled={index === total - 1}
              onClick={() => onMove(index + 1)}
            >
              <ChevronRight />
            </IconBtn>
          </div>
          <IconBtn label={`Quitar ${doc.name}`} danger onClick={onRemove}>
            <X />
          </IconBtn>
        </div>
      </div>

      <div className="p-2.5">
        <p
          className="truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-100"
          title={doc.path}
        >
          {doc.name}
        </p>
        <p
          className={[
            "mt-0.5 truncate text-[11px] tabular-nums",
            doc.error ? "text-rose-500" : "text-zinc-500 dark:text-zinc-400",
          ].join(" ")}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  danger,
  children,
  ...rest
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
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
