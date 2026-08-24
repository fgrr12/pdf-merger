import type { Page, Source } from "../types";
import { CardButton } from "./CardButton";
import { Check, Rotate, X } from "./Icons";
import { Thumb } from "./Thumb";

type Props = {
  page: Page;
  source: Source;
  position: number;
  selected: boolean;
  isDragging: boolean;
  isOver: boolean;
  onSelect: (extend: boolean) => void;
  onRotate: () => void;
  onRemove: () => void;
};

export function PageCard({
  page,
  source,
  position,
  selected,
  isDragging,
  isOver,
  onSelect,
  onRotate,
  onRemove,
}: Props) {
  return (
    <div
      onClick={(e) => onSelect(e.shiftKey)}
      className={[
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition",
        "dark:bg-zinc-900",
        selected
          ? "border-violet-500 ring-2 ring-violet-500/40"
          : "border-zinc-200 dark:border-white/10",
        isDragging ? "opacity-30" : "shadow-sm hover:-translate-y-0.5 hover:shadow-lg",
        isOver
          ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950"
          : "",
      ].join(" ")}
    >
      <div className="relative cursor-grab active:cursor-grabbing">
        <Thumb source={source} index={page.index} rotation={page.rotation} />

        <span
          className={[
            "pointer-events-none absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums text-white shadow-md",
            selected ? "bg-violet-500" : "bg-black/60",
          ].join(" ")}
        >
          {selected ? <Check className="h-3.5 w-3.5" /> : position}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-linear-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <CardButton
            label="Girar 90°"
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
          >
            <Rotate />
          </CardButton>
          <CardButton
            label="Quitar página"
            danger
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X />
          </CardButton>
        </div>
      </div>

      <div className="px-2 py-1.5">
        <p
          className="truncate text-[11px] text-zinc-500 dark:text-zinc-400"
          title={`${source.name} · página ${page.index + 1}`}
        >
          {source.kind === "image" ? source.name : `${source.name} · ${page.index + 1}`}
        </p>
      </div>
    </div>
  );
}
