import type { Block } from "../types";
import { formatSize } from "../lib/files";
import { CardButton } from "./CardButton";
import { ChevronLeft, ChevronRight, Rotate, X } from "./Icons";
import { Thumb } from "./Thumb";

type Props = {
  block: Block;
  position: number;
  total: number;
  isDragging: boolean;
  isOver: boolean;
  onRemove: () => void;
  onRotate: () => void;
  onMove: (to: number) => void;
};

export function BlockCard({
  block,
  position,
  total,
  isDragging,
  isOver,
  onRemove,
  onRotate,
  onMove,
}: Props) {
  const { source, pages } = block;
  const count = pages.length;
  const partial = count < source.pageCount;

  const subtitle = source.error
    ? "No se pudo leer"
    : source.kind === "image"
      ? `Imagen · ${formatSize(source.size)}`
      : `${count} ${count === 1 ? "página" : "páginas"}${
          partial ? ` de ${source.pageCount}` : ""
        } · ${formatSize(source.size)}`;

  return (
    <div
      className={[
        "group relative flex flex-col overflow-hidden rounded-xl border bg-white transition",
        "dark:bg-zinc-900",
        source.error
          ? "border-rose-300 dark:border-rose-500/40"
          : "border-zinc-200 dark:border-white/10",
        isDragging ? "opacity-30" : "shadow-sm hover:-translate-y-0.5 hover:shadow-lg",
        isOver
          ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950"
          : "",
      ].join(" ")}
    >
      <div className="relative cursor-grab active:cursor-grabbing">
        <Thumb source={source} index={pages[0].index} rotation={pages[0].rotation} />

        <span className="pointer-events-none absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-violet-600 px-1.5 text-xs font-semibold tabular-nums text-white shadow-md">
          {position}
        </span>

        {count > 1 && (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-xs">
            {count}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <div className="flex gap-1">
            <CardButton
              label="Mover antes"
              disabled={position === 1}
              onClick={() => onMove(position - 2)}
            >
              <ChevronLeft />
            </CardButton>
            <CardButton
              label="Mover después"
              disabled={position === total}
              onClick={() => onMove(position)}
            >
              <ChevronRight />
            </CardButton>
          </div>
          <div className="flex gap-1">
            <CardButton label="Girar 90°" onClick={onRotate}>
              <Rotate />
            </CardButton>
            <CardButton label={`Quitar ${source.name}`} danger onClick={onRemove}>
              <X />
            </CardButton>
          </div>
        </div>
      </div>

      <div className="p-2.5">
        <p
          className="truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-100"
          title={source.path}
        >
          {source.name}
        </p>
        <p
          className={[
            "mt-0.5 truncate text-[11px] tabular-nums",
            source.error ? "text-rose-500" : "text-zinc-500 dark:text-zinc-400",
          ].join(" ")}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
