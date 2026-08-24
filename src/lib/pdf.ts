import { readFile } from "@tauri-apps/plugin-fs";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type { Source, SourceKind } from "../types";
import { isImage } from "./files";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

/** Ancho de la miniatura en píxeles: ~2x el tamaño con que se dibuja, para retina. */
const THUMB_WIDTH = 260;

/**
 * Un documento de pdf.js abierto por archivo. Abrirlo es lo caro (parsea todo
 * el xref); tenerlo vivo hace que pasar por las 300 páginas de un PDF sea
 * instantáneo en vez de reabrirlo una vez por miniatura.
 */
const openDocs = new Map<string, Promise<PDFDocumentProxy>>();

/** Miniaturas ya dibujadas, por `ruta#página`. Un JPEG de estos pesa ~10 KB. */
const thumbs = new Map<string, string>();

/**
 * Las miniaturas se dibujan de a una. El IntersectionObserver puede pedir 30 de
 * golpe al hacer scroll, y 30 renders en paralelo trababan la ventana.
 */
let queue: Promise<unknown> = Promise.resolve();

export const kindOf = (path: string): SourceKind => (isImage(path) ? "image" : "pdf");

/** El lector que necesita `buildPdf`. Vive acá para que build.ts no toque Tauri. */
export const readSource = (path: string) => readFile(path);

function openDoc(path: string, bytes?: Uint8Array): Promise<PDFDocumentProxy> {
  let pending = openDocs.get(path);
  if (!pending) {
    pending = (async () => {
      const data = bytes ?? (await readFile(path));
      // pdf.js se queda con el buffer que recibe (lo transfiere al worker), así
      // que siempre va una copia.
      return pdfjs.getDocument({ data: new Uint8Array(data), disableAutoFetch: true }).promise;
    })();
    openDocs.set(path, pending);
  }
  return pending;
}

/** Se llama al quitar un archivo de la lista: libera el worker y sus miniaturas. */
export async function closeSource(path: string) {
  const pending = openDocs.get(path);
  openDocs.delete(path);
  for (const key of thumbs.keys()) if (key.startsWith(`${path}#`)) thumbs.delete(key);
  if (pending) await (await pending).destroy().catch(() => {});
}

export type Inspection = { kind: SourceKind; pageCount: number; size: number };

/** Cuántas páginas tiene y cuánto pesa. Deja el documento abierto para las miniaturas. */
export async function inspect(path: string): Promise<Inspection> {
  const bytes = await readFile(path);
  const kind = kindOf(path);
  if (kind === "image") return { kind, pageCount: 1, size: bytes.byteLength };
  const doc = await openDoc(path, bytes);
  return { kind, pageCount: doc.numPages, size: bytes.byteLength };
}

/** La miniatura si ya está dibujada, sin disparar nada. */
export const peekThumb = (source: Source, index: number) =>
  thumbs.get(`${source.path}#${index}`) ?? null;

export function thumbFor(source: Source, index: number): Promise<string> {
  const key = `${source.path}#${index}`;
  const cached = thumbs.get(key);
  if (cached) return Promise.resolve(cached);

  const next = queue.then(async () => {
    const again = thumbs.get(key);
    if (again) return again;
    const thumb =
      source.kind === "image" ? await imageThumb(source.path) : await pageThumb(source.path, index);
    thumbs.set(key, thumb);
    return thumb;
  });
  // La cola no se puede cortar por un archivo roto.
  queue = next.catch(() => {});
  return next;
}

async function pageThumb(path: string, index: number): Promise<string> {
  const doc = await openDoc(path);
  const page = await doc.getPage(index + 1);
  const scale = THUMB_WIDTH / page.getViewport({ scale: 1 }).width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.8);
}

async function imageThumb(path: string): Promise<string> {
  const bytes = await readFile(path);
  // Se dibuja en un canvas al tamaño de miniatura en lugar de guardar la foto
  // entera en base64: una foto de 5 MB serían 6,7 MB de string en memoria.
  const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    const scale = THUMB_WIDTH / image.width;
    canvas.width = THUMB_WIDTH;
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("sin contexto 2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("no se pudo leer la imagen"));
    image.src = url;
  });
}
