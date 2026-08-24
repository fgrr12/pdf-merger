import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readFile } from "@tauri-apps/plugin-fs";

import { mergeBytes } from "./merge";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/** Ancho en píxeles del thumbnail: 2x el tamaño con que se dibuja, para pantallas retina. */
const THUMB_WIDTH = 320;

export type Inspection = { pages: number; thumb: string | null; size: number };

/**
 * Cuenta las páginas, mide el archivo y dibuja la primera página como data URL.
 * `getDocument` se queda con el buffer que recibe (lo transfiere al worker),
 * por eso siempre se le pasa una copia.
 */
export async function inspect(path: string): Promise<Inspection> {
  const bytes = await readFile(path);
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableAutoFetch: true,
  });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const scale = THUMB_WIDTH / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return {
      pages: doc.numPages,
      thumb: canvas.toDataURL("image/jpeg", 0.82),
      size: bytes.byteLength,
    };
  } finally {
    await doc.destroy();
  }
}

/**
 * Lee los PDFs de a uno y los une. `onProgress` avisa después de cada archivo
 * para poder mover la barra sin que el merge sepa nada de la UI.
 */
export function merge(
  paths: string[],
  onProgress: (done: number) => void,
): Promise<Uint8Array> {
  async function* read() {
    for (let i = 0; i < paths.length; i++) {
      yield await readFile(paths[i]);
      onProgress(i + 1);
    }
  }
  return mergeBytes(read());
}
