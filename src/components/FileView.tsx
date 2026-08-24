import { useState } from "react";

import type { Block, Source } from "../types";
import { BlockCard } from "./BlockCard";
import { Plus } from "./Icons";

type Props = {
  blocks: Block[];
  /** Archivos que todavía se están leyendo o que fallaron: aún no tienen páginas. */
  pending: Source[];
  onRemove: (ids: string[]) => void;
  onRotate: (ids: string[]) => void;
  onMove: (ids: string[], to: number) => void;
  onAddFiles: () => void;
};

export function FileView({ blocks, pending, onRemove, onRotate, onMove, onAddFiles }: Props) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const endDrag = () => {
    setDragKey(null);
    setOverKey(null);
  };

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-4">
      {blocks.map((block, index) => (
        <li
          key={block.key}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            setDragKey(block.key);
          }}
          onDragEnd={endDrag}
          onDragOver={(e) => {
            if (!dragKey) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (overKey !== block.key) setOverKey(block.key);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dragged = blocks.find((b) => b.key === dragKey);
            if (dragged) onMove(ids(dragged), block.start);
            endDrag();
          }}
        >
          <BlockCard
            block={block}
            position={index + 1}
            total={blocks.length}
            isDragging={dragKey === block.key}
            isOver={overKey === block.key && dragKey !== null && dragKey !== block.key}
            onRemove={() => onRemove(ids(block))}
            onRotate={() => onRotate(ids(block))}
            onMove={(target) => onMove(ids(block), blocks[target].start)}
          />
        </li>
      ))}

      {pending.map((source) => (
        <li key={source.id}>
          <div className="flex aspect-3/4 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-zinc-400 dark:border-white/10 dark:bg-zinc-900">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-500 dark:border-zinc-700 dark:border-t-violet-400" />
            <span className="max-w-[85%] truncate px-2 text-[11px]">{source.name}</span>
          </div>
        </li>
      ))}

      <li>
        <button
          type="button"
          onClick={onAddFiles}
          className="flex aspect-3/4 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-400 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-white/15 dark:hover:border-violet-400/60 dark:hover:bg-violet-500/10"
        >
          <Plus className="h-6 w-6" />
          <span className="text-[13px] font-medium">Agregar más</span>
        </button>
      </li>
    </ul>
  );
}

const ids = (block: Block) => block.pages.map((p) => p.id);
