import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { exists, writeFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { DocGrid } from "./components/DocGrid";
import { EmptyState } from "./components/EmptyState";
import { OutputBar } from "./components/OutputBar";
import { Button } from "./components/ui";
import { Check, FolderPlus, Logo, Plus, Reverse, SortAZ, Trash } from "./components/Icons";
import { useDocuments } from "./hooks/useDocuments";
import { dirname, joinPath, pickFiles, pickFolder } from "./lib/files";
import { merge } from "./lib/pdf";

type Phase =
  | { kind: "idle" }
  | { kind: "merging"; done: number }
  | { kind: "done"; path: string };

const defaultName = () => `Unidos_${new Date().toISOString().slice(0, 10)}.pdf`;

export default function App() {
  const { docs, scanning, add, remove, clear, moveTo, sortByName, reverse } = useDocuments();
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const merging = phase.kind === "merging";
  const totalPages = useMemo(() => docs.reduce((sum, d) => sum + d.pages, 0), [docs]);

  // Los PDFs que se sueltan sobre la ventana los entrega el runtime de Tauri,
  // no el drag & drop del DOM (ese solo mueve tarjetas dentro de la grilla).
  useEffect(() => {
    const pending = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "over") setDragging(true);
      else if (event.payload.type === "drop") {
        setDragging(false);
        void add(event.payload.paths);
      } else setDragging(false);
    });
    return () => {
      void pending.then((unlisten) => unlisten());
    };
  }, [add]);

  // El primer PDF define los valores por defecto de salida; después manda el usuario.
  useEffect(() => {
    if (docs.length === 0) return;
    setFolder((current) => current || dirname(docs[0].path));
    setName((current) => current || defaultName());
  }, [docs]);

  const addFiles = useCallback(async () => void add(await pickFiles()), [add]);

  const addFolder = useCallback(async () => {
    const dir = await pickFolder("Elegí una carpeta con PDFs");
    if (dir) void add([dir]);
  }, [add]);

  const changeFolder = useCallback(async () => {
    const dir = await pickFolder("¿Dónde guardo el PDF unido?");
    if (dir) setFolder(dir);
  }, []);

  const run = useCallback(async () => {
    const filename = name.trim().toLowerCase().endsWith(".pdf") ? name.trim() : `${name.trim()}.pdf`;
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

      setPhase({ kind: "merging", done: 0 });
      const bytes = await merge(
        docs.map((d) => d.path),
        (done) => setPhase({ kind: "merging", done }),
      );
      await writeFile(target, bytes);
      setPhase({ kind: "done", path: target });
    } catch (e) {
      setPhase({ kind: "idle" });
      await message(`No se pudieron unir los PDFs.\n\n${e}`, {
        title: "Algo salió mal",
        kind: "error",
      });
    }
  }, [docs, folder, name]);

  const summary =
    docs.length === 0
      ? "Ningún archivo todavía"
      : `${docs.length} archivo${docs.length === 1 ? "" : "s"} · ${totalPages} página${totalPages === 1 ? "" : "s"}${scanning ? " · leyendo…" : ""}`;

  return (
    <div className="flex h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3 dark:border-white/10">
        <Logo />
        <div className="min-w-0">
          <h1 className="text-sm leading-tight font-semibold">Grapa</h1>
          <p className="truncate text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
            {summary}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" onClick={addFiles} title="Agregar PDFs">
            <Plus />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
          <Button variant="ghost" onClick={addFolder} title="Agregar todos los PDFs de una carpeta">
            <FolderPlus />
            <span className="hidden sm:inline">Carpeta</span>
          </Button>
          {docs.length > 1 && (
            <>
              <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-white/10" />
              <Button variant="ghost" onClick={sortByName} title="Ordenar por nombre (A-Z)">
                <SortAZ />
              </Button>
              <Button variant="ghost" onClick={reverse} title="Invertir el orden">
                <Reverse />
              </Button>
            </>
          )}
          {docs.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                clear();
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
        {docs.length === 0 ? (
          <EmptyState onAddFiles={addFiles} onAddFolder={addFolder} dragging={dragging} />
        ) : (
          <DocGrid docs={docs} onRemove={remove} onMoveTo={moveTo} onAddFiles={addFiles} />
        )}

        {dragging && docs.length > 0 && (
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
          <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-5">
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
        merging={merging}
        progress={merging && docs.length > 0 ? phase.done / docs.length : 0}
        disabled={docs.length === 0 || !name.trim() || !folder || merging}
        count={docs.length}
        onMerge={() => void run()}
      />
    </div>
  );
}
