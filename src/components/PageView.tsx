import { useState } from "react";

import type { Page, Source } from "../types";
import { PageCard } from "./PageCard";

type Props = {
  pages: Page[];
  sources: Record<string, Source>;
  selected: Set<string>;
  onSelect: (index: number, extend: boolean) => void;
  onRemove: (ids: string[]) => void;
  onRotate: (ids: string[]) => void;
  onMove: (ids: string[], to: number) => void;
};

export function PageView({
  pages,
  sources,
  selected,
  onSelect,
  onRemove,
  onRotate,
  onMove,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3.5">
      {pages.map((page, index) => {
        const source = sources[page.sourceId];
        if (!source) return null;
        return (
          <li
            key={page.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              setDragId(page.id);
            }}
            onDragEnd={endDrag}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overId !== page.id) setOverId(page.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              // Si lo que se arrastra es parte de la selección, se mueve toda junta.
              if (dragId) {
                const moving = selected.has(dragId) ? [...selected] : [dragId];
                onMove(moving, index);
              }
              endDrag();
            }}
          >
            <PageCard
              page={page}
              source={source}
              position={index + 1}
              selected={selected.has(page.id)}
              isDragging={dragId === page.id}
              isOver={overId === page.id && dragId !== null && dragId !== page.id}
              onSelect={(extend) => onSelect(index, extend)}
              onRotate={() => onRotate(selected.has(page.id) ? [...selected] : [page.id])}
              onRemove={() => onRemove(selected.has(page.id) ? [...selected] : [page.id])}
            />
          </li>
        );
      })}
    </ul>
  );
}
