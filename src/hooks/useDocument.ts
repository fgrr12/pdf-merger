import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { Page, Source } from "../types";
import { toBlocks, flatten } from "../lib/blocks";
import { basename, expandPaths } from "../lib/files";
import { closeSource, inspect, kindOf } from "../lib/pdf";

type State = { sources: Record<string, Source>; pages: Page[] };

type Action =
  | { type: "addSources"; sources: Source[] }
  | { type: "resolveSource"; id: string; pageCount: number; size: number; error?: string }
  | { type: "remove"; ids: string[] }
  | { type: "move"; ids: string[]; to: number }
  | { type: "rotate"; ids: string[]; delta: number }
  | { type: "sortByName" }
  | { type: "reverse" }
  | { type: "clear" }
  | { type: "undo" };

/** Lo que deshace Cmd+Z. Lo demás (metadatos que van llegando) no es una acción del usuario. */
const UNDOABLE = new Set(["remove", "move", "rotate", "sortByName", "reverse", "clear"]);
const MAX_UNDO = 30;

const EMPTY: State = { sources: {}, pages: [] };

type History = { present: State; past: State[] };

function apply(state: State, action: Action): State {
  switch (action.type) {
    case "addSources": {
      const sources = { ...state.sources };
      for (const source of action.sources) sources[source.id] = source;
      return { ...state, sources };
    }

    case "resolveSource": {
      const source = state.sources[action.id];
      if (!source) return state;
      const resolved: Source = {
        ...source,
        loading: false,
        error: action.error,
        pageCount: action.pageCount,
        size: action.size,
      };
      const pages = action.error
        ? state.pages
        : [
            ...state.pages,
            ...Array.from({ length: action.pageCount }, (_, index) => ({
              id: crypto.randomUUID(),
              sourceId: source.id,
              index,
              rotation: 0,
            })),
          ];
      return { sources: { ...state.sources, [action.id]: resolved }, pages };
    }

    case "remove": {
      const ids = new Set(action.ids);
      const pages = state.pages.filter((p) => !ids.has(p.id));
      if (pages.length === state.pages.length) return state;
      return { pages, sources: prune(state.sources, pages) };
    }

    case "move":
      return { ...state, pages: movePages(state.pages, action.ids, action.to) };

    case "rotate": {
      const ids = new Set(action.ids);
      return {
        ...state,
        pages: state.pages.map((p) =>
          ids.has(p.id) ? { ...p, rotation: (p.rotation + action.delta + 360) % 360 } : p,
        ),
      };
    }

    case "sortByName": {
      const blocks = [...toBlocks(state.pages, state.sources)].sort((a, b) =>
        a.source.name.localeCompare(b.source.name, "es", { numeric: true }),
      );
      return { ...state, pages: flatten(blocks) };
    }

    case "reverse":
      return { ...state, pages: flatten(toBlocks(state.pages, state.sources).reverse()) };

    case "clear":
      return EMPTY;

    default:
      return state;
  }
}

function reducer(history: History, action: Action): History {
  if (action.type === "undo") {
    const [previous, ...rest] = history.past;
    return previous ? { present: previous, past: rest } : history;
  }
  const present = apply(history.present, action);
  if (present === history.present) return history;
  if (!UNDOABLE.has(action.type)) return { ...history, present };
  return { present, past: [history.present, ...history.past].slice(0, MAX_UNDO) };
}

/** Saca de la lista los archivos que ya no aportan ninguna página. */
function prune(sources: Record<string, Source>, pages: Page[]): Record<string, Source> {
  const used = new Set(pages.map((p) => p.sourceId));
  const kept: Record<string, Source> = {};
  for (const source of Object.values(sources)) {
    // Los que todavía se están leyendo se quedan: sus páginas aún no existen.
    if (used.has(source.id) || source.loading || source.error) kept[source.id] = source;
  }
  return kept;
}

/**
 * Mueve un grupo de páginas (una sola, o el bloque entero de un archivo) para
 * que quede donde estaba la página `to`.
 */
function movePages(pages: Page[], ids: string[], to: number): Page[] {
  const moving = new Set(ids);
  const taken = pages.filter((p) => moving.has(p.id));
  if (taken.length === 0 || to < 0 || to >= pages.length) return pages;

  const rest = pages.filter((p) => !moving.has(p.id));
  const target = pages[to];
  if (moving.has(target.id)) return pages;

  const from = pages.findIndex((p) => p.id === taken[0].id);
  const landing = rest.indexOf(target);
  const at = from < to ? landing + 1 : landing;
  return [...rest.slice(0, at), ...taken, ...rest.slice(at)];
}

export function useDocument() {
  const [history, dispatch] = useReducer(reducer, { present: EMPTY, past: [] });
  const { sources, pages } = history.present;
  const [scanning, setScanning] = useState(false);

  /** Espejo síncrono de las rutas ya cargadas: evita duplicados aunque lleguen
      dos "agregar" en el mismo tick, sin leer estado dentro del reducer. */
  const known = useRef(new Set<string>());
  /** Archivos con un documento de pdf.js abierto, para poder cerrarlo al sacarlos. */
  const open = useRef(new Set<string>());

  const blocks = useMemo(() => toBlocks(pages, sources), [pages, sources]);

  // Cuando un archivo desaparece de la lista, se libera su worker y sus miniaturas.
  useEffect(() => {
    const alive = new Set(Object.values(sources).map((s) => s.path));
    for (const path of open.current) {
      if (!alive.has(path)) {
        open.current.delete(path);
        known.current.delete(path);
        void closeSource(path);
      }
    }
    for (const path of alive) open.current.add(path);
  }, [sources]);

  const add = useCallback(async (raw: string[]) => {
    setScanning(true);
    try {
      const paths = (await expandPaths(raw)).filter((p) => !known.current.has(p));
      if (paths.length === 0) return;
      paths.forEach((p) => known.current.add(p));

      const fresh: Source[] = paths.map((path) => ({
        id: crypto.randomUUID(),
        path,
        name: basename(path),
        kind: kindOf(path),
        size: 0,
        pageCount: 0,
        loading: true,
      }));
      dispatch({ type: "addSources", sources: fresh });

      // De a uno y en orden: así las páginas entran en el orden en que el
      // usuario eligió los archivos, y no se abren 40 workers a la vez.
      for (const source of fresh) {
        try {
          const { pageCount, size } = await inspect(source.path);
          dispatch({ type: "resolveSource", id: source.id, pageCount, size });
        } catch (e) {
          dispatch({
            type: "resolveSource",
            id: source.id,
            pageCount: 0,
            size: 0,
            error: String(e),
          });
        }
      }
    } finally {
      setScanning(false);
    }
  }, []);

  return {
    sources,
    pages,
    blocks,
    scanning,
    canUndo: history.past.length > 0,
    add,
    remove: useCallback((ids: string[]) => dispatch({ type: "remove", ids }), []),
    move: useCallback((ids: string[], to: number) => dispatch({ type: "move", ids, to }), []),
    rotate: useCallback(
      (ids: string[], delta: number) => dispatch({ type: "rotate", ids, delta }),
      [],
    ),
    sortByName: useCallback(() => dispatch({ type: "sortByName" }), []),
    reverse: useCallback(() => dispatch({ type: "reverse" }), []),
    clear: useCallback(() => dispatch({ type: "clear" }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
  };
}
