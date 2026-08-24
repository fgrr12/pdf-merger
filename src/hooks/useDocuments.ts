import { useCallback, useRef, useState } from "react";
import type { Doc } from "../types";
import { basename, expandPaths } from "../lib/files";
import { inspect } from "../lib/pdf";

export function useDocuments() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [scanning, setScanning] = useState(false);
  /** Espejo síncrono de las rutas ya cargadas: evita duplicados aunque lleguen
      dos "agregar" en el mismo tick, sin leer estado dentro del updater. */
  const known = useRef(new Set<string>());

  const patch = useCallback((id: string, fields: Partial<Doc>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)));
  }, []);

  const add = useCallback(
    async (raw: string[]) => {
      setScanning(true);
      try {
        const paths = (await expandPaths(raw)).filter((p) => !known.current.has(p));
        if (paths.length === 0) return;
        paths.forEach((p) => known.current.add(p));

        const fresh: Doc[] = paths.map((path) => ({
          id: crypto.randomUUID(),
          path,
          name: basename(path),
          size: 0,
          pages: 0,
          thumb: null,
          loading: true,
        }));
        setDocs((prev) => [...prev, ...fresh]);

        // De a uno: cada inspección levanta un worker de pdf.js, y 40 a la vez
        // se come la memoria sin que la UI gane nada (las tarjetas ya están).
        for (const doc of fresh) {
          try {
            const { pages, thumb, size } = await inspect(doc.path);
            patch(doc.id, { pages, thumb, size, loading: false });
          } catch (e) {
            patch(doc.id, { loading: false, error: String(e) });
          }
        }
      } finally {
        setScanning(false);
      }
    },
    [patch],
  );

  const remove = useCallback((id: string) => {
    setDocs((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc) known.current.delete(doc.path);
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    known.current.clear();
    setDocs([]);
  }, []);

  /** Mueve el documento `id` a la posición `to` (el resto se corre). */
  const moveTo = useCallback((id: string, to: number) => {
    setDocs((prev) => {
      const from = prev.findIndex((d) => d.id === id);
      if (from === -1 || to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }, []);

  const sortByName = useCallback(() => {
    setDocs((prev) =>
      [...prev].sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true })),
    );
  }, []);

  const reverse = useCallback(() => setDocs((prev) => [...prev].reverse()), []);

  return { docs, scanning, add, remove, clear, moveTo, sortByName, reverse };
}
