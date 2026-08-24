import { useState } from "react";
import type { Doc } from "../types";
import { DocCard } from "./DocCard";
import { Plus } from "./Icons";

type Props = {
  docs: Doc[];
  onRemove: (id: string) => void;
  onMoveTo: (id: string, to: number) => void;
  onAddFiles: () => void;
};

export function DocGrid({ docs, onRemove, onMoveTo, onAddFiles }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const endDrag = () => {
    setDragId(null);
    setOverIndex(null);
  };

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-4">
      {docs.map((doc, index) => (
        <li
          key={doc.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            setDragId(doc.id);
          }}
          onDragEnd={endDrag}
          onDragOver={(e) => {
            if (!dragId) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (overIndex !== index) setOverIndex(index);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) onMoveTo(dragId, index);
            endDrag();
          }}
        >
          <DocCard
            doc={doc}
            index={index}
            total={docs.length}
            isDragging={dragId === doc.id}
            isOver={overIndex === index && dragId !== null && dragId !== doc.id}
            onRemove={() => onRemove(doc.id)}
            onMove={(to) => onMoveTo(doc.id, to)}
          />
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
