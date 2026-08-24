import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { exists, writeFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { EmptyState } from "./components/EmptyState";
import { FileView } from "./components/FileView";
import { PageView } from "./components/PageView";
import { OutputBar } from "./components/OutputBar";
import { Button } from "./components/ui";
import {
  Check,
  Files,
  FolderPlus,
  Grid,
  Logo,
  Plus,
  Reverse,
  SortAZ,
  Trash,
  Undo,
} from "./components/Icons";
import { useDocument } from "./hooks/useDocument";
import { buildPdf } from "./lib/build";
import { dirname, joinPath, pickFiles, pickFolder } from "./lib/files";
import { readSource } from "./lib/pdf";

type View = "files" | "pages";

type Phase =
  | { kind: "idle" }
  | { kind: "working"; done: number; total: number }
  | { kind: "done"; path: string };

const defaultName = () => `Unidos_${new Date().toISOString().slice(0, 10)}.pdf`;

export default function App() {
  const doc = useDocument();
  const { sources, pages, blocks, scanning } = doc;

  const [view, setView] = useState<View>("files");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<number | null>(null);

  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [bookmarks, setBookmarks] = useState(true);
  const [pageNumbers, setPageNumbers] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const working = phase.kind === "working";
  const pending = useMemo(
    () => Object.values(sources).filter((s) => s.loading || s.error),
    [sources],
  );
  const chosen = useMemo(
    () => (selected.size > 0 ? pages.filter((p) => selected.has(p.id)) : pages),
    [pages, selected],
  );

  // Los PDFs que se sueltan sobre la ventana los entrega el runtime de Tauri,
  // no el drag & drop del DOM (ese solo mueve tarjetas dentro de la grilla).
  useEffect(() => {
    const pendingUnlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "over") setDragging(true);
      else if (event.payload.type === "drop") {
        setDragging(false);
        void doc.add(event.payload.paths);
      } else setDragging(false);
    });
    return () => {
      void pendingUnlisten.then((unlisten) => unlisten());
    };
  }, [doc.add]);

  // El primer archivo define los valores por defecto de salida; después manda el usuario.
  useEffect(() => {
    if (blocks.length === 0) return;
    setFolder((current) => current || dirname(blocks[0].source.path));
    setName((current) => current || defaultName());
  }, [blocks]);

  // Una página que ya no existe no puede seguir seleccionada.
  useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;
      const alive = new Set(pages.map((p) => p.id));
      const next = new Set([...current].filter((id) => alive.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [pages]);

  const clearSelection = useCallback(() => {
    anchor.current = null;
    setSelected(new Set());
  }, []);

  const selectAt = useCallback(
    (index: number, extend: boolean) => {
      setSelected((current) => {
        const next = new Set(current);
        if (extend && anchor.current !== null) {
          const [from, to] = [anchor.current, index].sort((a, b) => a - b);
          for (let i = from; i <= to; i++) next.add(pages[i].id);
          return next;
        }
        const id = pages[index].id;
        if (next.has(id)) next.delete(id);
        else next.add(id);
        anchor.current = index;
        return next;
      });
    },
    [pages],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        doc.undo();
      } else if (e.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc.undo, clearSelection]);

  const addFiles = useCallback(async () => void doc.add(await pickFiles()), [doc.add]);

  const addFolder = useCallback(async () => {
    const dir = await pickFolder("Elegí una carpeta");
    if (dir) void doc.add([dir]);
  }, [doc.add]);

  const changeFolder = useCallback(async () => {
    const dir = await pickFolder("¿Dónde guardo el PDF?");
    if (dir) setFolder(dir);
  }, []);

  const run = useCallback(async () => {
    const trimmed = name.trim();
    const filename = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
    const target = joinPath(folder, filename);

    // Todo va dentro del try: si algo falla (permisos, PDF ilegible, disco), el
    // usuario tiene que ver el error. Una promesa rechazada acá no se ve en ningún lado.
    try {
      if (await exists(target)) {
        const replace = await ask(`Ya existe "${filename}" en esa carpeta.\n¿Lo reemplazo?`, {
          title: "El archivo ya existe",
          kind: "warning",
          okLabel: "Reemplazar",
          cancelLabel: "Cancelar",
        });
        if (!replace) return;
      }

      setPhase({ kind: "working", done: 0, total: chosen.length });
      const bytes = await buildPdf({
        pages: chosen,
        sources,
        read: readSource,
        options: { bookmarks, pageNumbers },
        onProgress: (done, total) => setPhase({ kind: "working", done, total }),
      });
      await writeFile(target, bytes);
      setPhase({ kind: "done", path: target });
    } catch (e) {
      setPhase({ kind: "idle" });
      await message(`No se pudo armar el PDF.\n\n${e}`, {
        title: "Algo salió mal",
        kind: "error",
      });
    }
  }, [bookmarks, chosen, folder, name, pageNumbers, sources]);

  const summary = () => {
    if (pages.length === 0 && pending.length === 0) return "Ningún archivo todavía";
    const files = `${blocks.length} archivo${blocks.length === 1 ? "" : "s"}`;
    const count = `${pages.length} página${pages.length === 1 ? "" : "s"}`;
    const extra = selected.size > 0 ? ` · ${selected.size} seleccionada${selected.size === 1 ? "" : "s"}` : "";
    return `${files} · ${count}${extra}${scanning ? " · leyendo…" : ""}`;
  };

  const buttonLabel =
    selected.size > 0
      ? `Exportar ${selected.size} página${selected.size === 1 ? "" : "s"}`
      : blocks.length > 1
        ? `Unir ${blocks.length} archivos`
        : "Exportar PDF";

  return (
    <div className="flex h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3 dark:border-white/10">
        <Logo />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight">Grapa</h1>
          <p className="truncate text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
            {summary()}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {pages.length > 0 && (
            <div className="mr-1 flex rounded-lg bg-zinc-900/5 p-0.5 dark:bg-white/10">
              <ViewTab active={view === "files"} onClick={() => setView("files")} label="Archivos">
                <Files />
              </ViewTab>
              <ViewTab active={view === "pages"} onClick={() => setView("pages")} label="Páginas">
                <Grid />
              </ViewTab>
            </div>
          )}

          <Button variant="ghost" onClick={addFiles} title="Agregar PDFs o imágenes">
            <Plus />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
          <Button variant="ghost" onClick={addFolder} title="Agregar todo lo de una carpeta">
            <FolderPlus />
            <span className="hidden sm:inline">Carpeta</span>
          </Button>

          {(blocks.length > 1 || doc.canUndo || pages.length > 0) && (
            <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-white/10" />
          )}

          {doc.canUndo && (
            <Button variant="ghost" onClick={doc.undo} title="Deshacer (⌘Z)">
              <Undo />
            </Button>
          )}
          {blocks.length > 1 && (
            <>
              <Button variant="ghost" onClick={doc.sortByName} title="Ordenar por nombre (A-Z)">
                <SortAZ />
              </Button>
              <Button variant="ghost" onClick={doc.reverse} title="Invertir el orden">
                <Reverse />
              </Button>
            </>
          )}
          {pages.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                doc.clear();
                clearSelection();
                setPhase({ kind: "idle" });
              }}
              title="Vaciar la lista"
              className="hover:text-rose-600 dark:hover:text-rose-400"
            >
              <Trash />
            </Button>
          )}
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto p-5">
        {pages.length === 0 && pending.length === 0 ? (
          <EmptyState onAddFiles={addFiles} onAddFolder={addFolder} dragging={dragging} />
        ) : view === "files" ? (
          <FileView
            blocks={blocks}
            pending={pending}
            onRemove={doc.remove}
            onRotate={(ids) => doc.rotate(ids, 90)}
            onMove={doc.move}
            onAddFiles={addFiles}
          />
        ) : (
          <PageView
            pages={pages}
            sources={sources}
            selected={selected}
            onSelect={selectAt}
            onRemove={doc.remove}
            onRotate={(ids) => doc.rotate(ids, 90)}
            onMove={doc.move}
          />
        )}

        {view === "pages" && selected.size > 0 && (
          <div className="sticky bottom-0 mt-4 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-[12px] shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-900/95">
              <span className="text-zinc-600 dark:text-zinc-300">
                {selected.size} seleccionada{selected.size === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => doc.rotate([...selected], 90)}
                className="rounded-full px-2 py-0.5 text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/15"
              >
                Girar
              </button>
              <button
                type="button"
                onClick={() => doc.remove([...selected])}
                className="rounded-full px-2 py-0.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/15"
              >
                Quitar
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full px-2 py-0.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

        {dragging && pages.length > 0 && (
          <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-violet-600/10 backdrop-blur-[2px]">
            <div className="rounded-2xl border-2 border-dashed border-violet-500 bg-white px-8 py-6 text-center shadow-xl dark:bg-zinc-900">
              <p className="text-base font-semibold">Soltá para agregarlos</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Van al final de la lista
              </p>
            </div>
          </div>
        )}

        {phase.kind === "done" && (
          <div className="fixed inset-x-0 bottom-32 z-30 flex justify-center px-5">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl dark:border-emerald-500/30 dark:bg-zinc-900">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Check />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">¡Listo!</p>
                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {phase.path}
                </p>
              </div>
              <Button onClick={() => void revealItemInDir(phase.path)}>Abrir carpeta</Button>
              <Button variant="ghost" onClick={() => setPhase({ kind: "idle" })}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </main>

      <OutputBar
        name={name}
        onName={setName}
        folder={folder}
        onPickFolder={changeFolder}
        bookmarks={bookmarks}
        onBookmarks={setBookmarks}
        pageNumbers={pageNumbers}
        onPageNumbers={setPageNumbers}
        merging={working}
        progress={working && phase.total > 0 ? phase.done / phase.total : 0}
        disabled={chosen.length === 0 || !name.trim() || !folder || working}
        label={buttonLabel}
        onRun={() => void run()}
      />
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Ver por ${label.toLowerCase()}`}
      className={[
        "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition",
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white",
      ].join(" ")}
    >
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
