// Chequeo del armado del PDF: orden, subconjuntos, giro, imágenes, numeración
// y marcadores. Corre con `pnpm check` (node ejecuta el .ts directamente).
import assert from "node:assert/strict";
import { PDFDocument, PDFName, degrees } from "pdf-lib";
import sharp from "sharp";
import { buildPdf } from "../src/lib/build.ts";

/** PDF donde todas las páginas son cuadradas de `size`, para reconocerlas después. */
async function makePdf(size, pageCount, rotation = 0) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([size, size]);
    if (rotation) page.setRotation(degrees(rotation));
  }
  return doc.save();
}

const files = {
  "/a.pdf": await makePdf(200, 2),
  "/b.pdf": await makePdf(300, 3),
  "/c.pdf": await makePdf(400, 1),
  "/torcida.pdf": await makePdf(500, 1, 90),
  "/foto.png": await sharp({
    create: { width: 800, height: 400, channels: 3, background: "#4c1d95" },
  }).png().toBuffer(),
};

const read = async (path) => new Uint8Array(files[path]);

const source = (id, path, kind, pageCount) => ({
  id, path, kind, pageCount,
  name: path.slice(1), size: files[path].length, loading: false,
});

const sources = {
  a: source("a", "/a.pdf", "pdf", 2),
  b: source("b", "/b.pdf", "pdf", 3),
  c: source("c", "/c.pdf", "pdf", 1),
  t: source("t", "/torcida.pdf", "pdf", 1),
  img: source("img", "/foto.png", "image", 1),
};

const page = (sourceId, index, rotation = 0) => ({
  id: `${sourceId}-${index}-${rotation}`, sourceId, index, rotation,
});

const allOf = (id) =>
  Array.from({ length: sources[id].pageCount }, (_, i) => page(id, i));

const build = async (pages, options = { bookmarks: false, pageNumbers: false }) =>
  PDFDocument.load(await buildPdf({ pages, sources, read, options }));

const widths = (doc) => doc.getPages().map((p) => Math.round(p.getWidth()));

// --- orden y cantidad ---------------------------------------------------
assert.deepEqual(
  widths(await build([...allOf("a"), ...allOf("b"), ...allOf("c")])),
  [200, 200, 300, 300, 300, 400],
  "el orden de entrada define el orden de salida",
);
assert.deepEqual(
  widths(await build([...allOf("c"), ...allOf("b"), ...allOf("a")])),
  [400, 300, 300, 300, 200, 200],
  "invertir la lista invierte la salida",
);

// --- extraer un subconjunto, y páginas intercaladas ----------------------
assert.deepEqual(
  widths(await build([page("b", 2), page("a", 0)])),
  [300, 200],
  "se puede exportar cualquier subconjunto de páginas",
);
assert.deepEqual(
  widths(await build([page("a", 0), page("b", 0), page("a", 1)])),
  [200, 300, 200],
  "las páginas de un mismo archivo se pueden intercalar con las de otro",
);

// --- giro ----------------------------------------------------------------
const girado = await build([page("a", 0, 90), page("a", 1, 180)]);
assert.deepEqual(
  girado.getPages().map((p) => p.getRotation().angle),
  [90, 180],
  "el giro del usuario llega al PDF",
);
const sumado = await build([page("t", 0, 90)]);
assert.equal(
  sumado.getPage(0).getRotation().angle,
  180,
  "el giro se suma al que la página ya traía, no lo reemplaza",
);

// --- imágenes ------------------------------------------------------------
const conFoto = await build([page("img", 0), page("a", 0)]);
assert.equal(conFoto.getPageCount(), 2, "la imagen entra como una página más");
const hoja = conFoto.getPage(0);
assert.ok(
  hoja.getWidth() > hoja.getHeight(),
  "una foto apaisada arma una hoja apaisada",
);
assert.ok(
  Math.round(hoja.getWidth()) === 842,
  `la foto se ajusta a A4 y no usa su tamaño en píxeles (${hoja.getWidth()})`,
);

// --- numeración ----------------------------------------------------------
const paginas = [...allOf("a"), page("t", 0), page("img", 0)];
const sinNumeros = await buildPdf({ pages: paginas, sources, read, options: { bookmarks: false, pageNumbers: false } });
const conNumeros = await buildPdf({ pages: paginas, sources, read, options: { bookmarks: false, pageNumbers: true } });
assert.ok(conNumeros.length > sinNumeros.length, "numerar agrega contenido");
assert.equal(
  (await PDFDocument.load(conNumeros)).getPageCount(),
  paginas.length,
  "numerar no cambia la cantidad de páginas, ni con páginas giradas",
);

// --- marcadores ----------------------------------------------------------
const conIndice = await build(
  [...allOf("a"), ...allOf("b"), ...allOf("c")],
  { bookmarks: true, pageNumbers: false },
);
const outlines = conIndice.catalog.lookup(PDFName.of("Outlines"));
assert.ok(outlines, "se generó el índice de marcadores");
assert.equal(
  outlines.lookup(PDFName.of("Count")).asNumber(),
  3,
  "un marcador por archivo",
);

const unSoloArchivo = await build(allOf("a"), { bookmarks: true, pageNumbers: false });
assert.equal(
  unSoloArchivo.catalog.lookup(PDFName.of("Outlines")),
  undefined,
  "con un solo archivo no se agrega índice",
);

console.log("ok — orden, subconjuntos, giro, imágenes, numeración y marcadores");
