import { useCallback } from "react";

import type { Page, Source } from "../types";
import { useReorder } from "../hooks/useReorder";
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
  const commit = useCallback(
    (key: string, to: number) => {
      // Si lo que se arrastra es parte de la selección, se mueve toda junta.
      onMove(selected.has(key) ? [...selected] : [key], to);
    },
    [onMove, selected],
  );

  const { dragKey, overIndex, handlers } = useReorder({ onCommit: commit, onTap: onSelect });

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3.5">
      {pages.map((page, index) => {
        const source = sources[page.sourceId];
        if (!source) return null;
        return (
          <li key={page.id} {...handlers(page.id, index)}>
            <PageCard
              page={page}
              source={source}
              position={index + 1}
              total={pages.length}
              selected={selected.has(page.id)}
              isDragging={dragKey === page.id}
              isOver={overIndex === index && dragKey !== null && dragKey !== page.id}
              onRotate={() => onRotate(selected.has(page.id) ? [...selected] : [page.id])}
              onRemove={() => onRemove(selected.has(page.id) ? [...selected] : [page.id])}
              onMove={(to) => onMove([page.id], to)}
            />
          </li>
        );
      })}
    </ul>
  );
}
