import type { Block, Page, Source } from "../types";

/** Agrupa las páginas en corridas consecutivas del mismo archivo. */
export function toBlocks(pages: Page[], sources: Record<string, Source>): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const previous = blocks[blocks.length - 1];
    if (previous && previous.source.id === page.sourceId) {
      previous.pages.push(page);
      continue;
    }
    const source = sources[page.sourceId];
    if (!source) continue;
    blocks.push({ key: page.id, source, pages: [page], start: i });
  }
  return blocks;
}

export const flatten = (blocks: Block[]): Page[] => blocks.flatMap((b) => b.pages);
