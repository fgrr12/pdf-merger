import { PDFDocument } from "pdf-lib";

/**
 * Une los PDFs en el orden en que llegan.
 *
 * Recibe un iterable asíncrono, no un array, para no tener que leer todos los
 * archivos antes de empezar: quien llame va leyendo de a uno y este módulo
 * queda libre de Tauri (por eso se puede probar con node, ver scripts/).
 */
export async function mergeBytes(sources: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for await (const bytes of sources) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  return out.save();
}
