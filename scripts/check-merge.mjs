// Chequeo del núcleo del merge: que respete el orden y no pierda páginas.
// Corre con `node scripts/check-merge.mjs` (node ejecuta el .ts directamente).
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { mergeBytes } from "../src/lib/merge.ts";

/** Un PDF donde cada página mide `size` x `size`, para poder identificarlas después. */
async function makePdf(size, pageCount) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([size, size]);
  return doc.save();
}

const a = await makePdf(200, 2);
const b = await makePdf(300, 3);
const c = await makePdf(400, 1);

async function* sources(...docs) {
  for (const d of docs) yield d;
}

const merged = await PDFDocument.load(await mergeBytes(sources(a, b, c)));
const widths = merged.getPages().map((p) => Math.round(p.getWidth()));
assert.deepEqual(widths, [200, 200, 300, 300, 300, 400], "orden o cantidad de páginas");

// El orden inverso tiene que salir invertido: la lista manda, no el nombre.
const reversed = await PDFDocument.load(await mergeBytes(sources(c, b, a)));
assert.deepEqual(
  reversed.getPages().map((p) => Math.round(p.getWidth())),
  [400, 300, 300, 300, 200, 200],
  "el orden de entrada define el orden de salida",
);

// Un solo PDF tiene que salir igual de largo.
const single = await PDFDocument.load(await mergeBytes(sources(b)));
assert.equal(single.getPageCount(), 3);

console.log("ok — merge respeta orden y cantidad de páginas");
