import {
  degrees,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

import type { Page, Source } from "../types";

export type BuildOptions = {
  /** Un marcador por archivo, apuntando a su primera página. */
  bookmarks: boolean;
  /** Número al pie de cada página. */
  pageNumbers: boolean;
};

export type BuildInput = {
  pages: Page[];
  sources: Record<string, Source>;
  /** Inyectado: en la app lo pone Tauri, en el chequeo lo pone node. */
  read: (path: string) => Promise<Uint8Array>;
  options: BuildOptions;
  onProgress?: (done: number, total: number) => void;
};

const A4 = { width: 595.28, height: 841.89 };
const NUMBER_SIZE = 10;
const NUMBER_MARGIN = 24;

/**
 * Arma el PDF final a partir de la lista de páginas, en ese orden.
 *
 * Módulo puro a propósito: no importa nada de Tauri ni de Vite, así el chequeo
 * de `scripts/` lo puede correr tal cual con node.
 */
export async function buildPdf({
  pages,
  sources,
  read,
  options,
  onProgress,
}: BuildInput): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const loaded = new Map<string, PDFDocument>();
  const bytesOf = new Map<string, Uint8Array>();
  const bookmarks: { title: string; pageIndex: number }[] = [];
  let done = 0;

  const bytesFor = async (source: Source) => {
    let bytes = bytesOf.get(source.path);
    if (!bytes) {
      bytes = await read(source.path);
      bytesOf.set(source.path, bytes);
    }
    return bytes;
  };

  // Se procesa por corridas del mismo archivo: `copyPages` en una sola llamada
  // por corrida evita que pdf-lib duplique los recursos embebidos (fuentes,
  // imágenes) una vez por página, que es lo que infla el archivo de salida.
  for (const run of runs(pages)) {
    const source = sources[run[0].sourceId];
    if (!source) continue;

    bookmarks.push({ title: source.name, pageIndex: out.getPageCount() });

    if (source.kind === "image") {
      for (const page of run) {
        await addImagePage(out, await bytesFor(source), source.path, page.rotation);
        onProgress?.(++done, pages.length);
      }
      continue;
    }

    let src = loaded.get(source.id);
    if (!src) {
      src = await PDFDocument.load(await bytesFor(source), { ignoreEncryption: true });
      loaded.set(source.id, src);
    }

    const copied = await out.copyPages(
      src,
      run.map((p) => p.index),
    );
    copied.forEach((page, i) => {
      out.addPage(page);
      addRotation(page, run[i].rotation);
      onProgress?.(++done, pages.length);
    });
  }

  if (options.pageNumbers) await drawPageNumbers(out);
  if (options.bookmarks && bookmarks.length > 1) setOutline(out, bookmarks);

  return out.save();
}

/** Parte la lista en corridas consecutivas del mismo archivo. */
function runs(pages: Page[]): Page[][] {
  const out: Page[][] = [];
  for (const page of pages) {
    const last = out[out.length - 1];
    if (last && last[0].sourceId === page.sourceId) last.push(page);
    else out.push([page]);
  }
  return out;
}

/** El giro del usuario se suma al que la página ya tenía en el original. */
function addRotation(page: PDFPage, extra: number) {
  if (extra % 360 === 0) return;
  page.setRotation(degrees((page.getRotation().angle + extra) % 360));
}

async function addImagePage(
  out: PDFDocument,
  bytes: Uint8Array,
  path: string,
  rotation: number,
) {
  const image = path.toLowerCase().endsWith(".png")
    ? await out.embedPng(bytes)
    : await out.embedJpg(bytes);

  // Hoja A4 con la orientación de la foto, y la foto centrada adentro. Usar el
  // tamaño en píxeles como tamaño de página daría hojas gigantes al imprimir.
  const landscape = image.width > image.height;
  const size = landscape
    ? { width: A4.height, height: A4.width }
    : { width: A4.width, height: A4.height };
  const scale = Math.min(size.width / image.width, size.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  const page = out.addPage([size.width, size.height]);
  page.drawImage(image, {
    x: (size.width - width) / 2,
    y: (size.height - height) / 2,
    width,
    height,
  });
  addRotation(page, rotation);
}

/**
 * Número al pie. Se dibuja en el sistema de coordenadas sin rotar, así que en
 * una página girada hay que llevarlo al borde que quedó abajo *y* girar el
 * texto, o sale de costado en el lugar equivocado.
 */
async function drawPageNumbers(out: PDFDocument) {
  const font = await out.embedFont(StandardFonts.Helvetica);
  const color = rgb(0.45, 0.45, 0.5);

  out.getPages().forEach((page, i) => {
    const label = String(i + 1);
    const textWidth = font.widthOfTextAtSize(label, NUMBER_SIZE);
    const { width, height } = page.getSize();
    const angle = ((page.getRotation().angle % 360) + 360) % 360;

    const spot = {
      0: { x: width / 2 - textWidth / 2, y: NUMBER_MARGIN },
      90: { x: NUMBER_MARGIN + NUMBER_SIZE, y: height / 2 - textWidth / 2 },
      180: { x: width / 2 + textWidth / 2, y: height - NUMBER_MARGIN },
      270: { x: width - NUMBER_MARGIN - NUMBER_SIZE, y: height / 2 + textWidth / 2 },
    }[angle] ?? { x: width / 2 - textWidth / 2, y: NUMBER_MARGIN };

    page.drawText(label, {
      ...spot,
      size: NUMBER_SIZE,
      font,
      color,
      rotate: degrees(angle),
    });
  });
}

/** Índice de marcadores: un ítem por archivo, sin anidar. */
function setOutline(doc: PDFDocument, items: { title: string; pageIndex: number }[]) {
  const context = doc.context;
  const outlinesRef = context.nextRef();
  const itemRefs = items.map(() => context.nextRef());

  items.forEach((item, i) => {
    context.assign(
      itemRefs[i],
      context.obj({
        Title: PDFHexString.fromText(item.title),
        Parent: outlinesRef,
        Dest: [doc.getPage(item.pageIndex).ref, PDFName.of("Fit")],
        ...(i > 0 ? { Prev: itemRefs[i - 1] } : {}),
        ...(i < items.length - 1 ? { Next: itemRefs[i + 1] } : {}),
      }),
    );
  });

  context.assign(
    outlinesRef,
    context.obj({
      Type: "Outlines",
      First: itemRefs[0],
      Last: itemRefs[itemRefs.length - 1],
      Count: items.length,
    }),
  );
  doc.catalog.set(PDFName.of("Outlines"), outlinesRef);
}
