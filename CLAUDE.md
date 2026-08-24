# CLAUDE.md

## Qué es esto

**Grapa** — app de escritorio (Tauri 2) para armar un PDF a partir de otros PDFs e
imágenes: unir, reordenar por archivo o por página, girar, extraer y exportar. Tauri v2 + React 19 + TS +
Tailwind 4, `pnpm`. UI en español. La versión vieja en Python/tkinter está en
`legacy/` y ya no se mantiene.

## Comandos

```bash
pnpm install
pnpm t:d              # tauri dev (levanta Vite en el puerto fijo 1420)
pnpm t:b              # tauri build → src-tauri/target/release/bundle/
pnpm build            # typecheck (tsc) + vite build, solo frontend
pnpm check            # chequeo del armado (node corre el .ts directo, sin framework)
pnpm icons            # regenera src-tauri/icons/ desde src/lib/logo.ts
```

No hay linter. Las dos verificaciones automáticas son `pnpm build` (tsc estricto, con
`noUnusedLocals`/`noUnusedParameters`) y `pnpm check`; si tocaste Rust, `cargo check`
desde `src-tauri/`.

`scripts/check-build.mjs` arma PDFs de páginas cuadradas de distinto tamaño (y una
imagen) para verificar orden, subconjuntos, giro, imágenes, numeración y marcadores.

## Arquitectura

### Rust no hace nada

`src-tauri/src/lib.rs` solo registra los plugins `dialog`, `fs` y `opener`. **Toda** la
lógica de PDF vive en el frontend: `pdf-lib` arma el documento y `pdf.js` (`pdfjs-dist`)
dibuja las miniaturas. Antes de agregar un comando de Tauri, fijate si no se resuelve en
JS — la decisión acá fue no tener capa de IPC ni dependencias de PDF en Rust.

### La lista de páginas es la verdad

El estado son **páginas**, no archivos (`src/types.ts`). Cada `Page` apunta a un `Source`
(el archivo), un índice dentro de él y un giro. La vista de archivos se **deriva**:
`toBlocks()` agrupa páginas consecutivas del mismo archivo, así que mientras nadie
intercale nada hay exactamente un bloque por archivo y se ve igual que antes. Si el
usuario mezcla páginas en la vista de páginas, un archivo aparece como varios bloques —
es incómodo pero es la verdad, no lo "arregles" reagrupando por archivo.

Un archivo recién agregado existe como `Source` antes de tener páginas (todavía no se
sabe cuántas son). Por eso `FileView` recibe aparte los `pending`: si no, la tarjeta no
aparecería hasta terminar de leer el archivo.

### El armado del PDF es un módulo puro

`src/lib/build.ts` no importa nada de Tauri ni de Vite: recibe un `read(path)` inyectado.
Es lo que permite que `pnpm check` lo corra tal cual con node y verifique orden,
subconjuntos, giro, imágenes, numeración y marcadores contra PDFs de verdad. Si le
agregás una dependencia del entorno, el chequeo deja de correr.

Dos cosas ahí que parecen rebuscadas y no lo son:

- Copia **por corridas** (`runs`), no página por página. Un `copyPages` por página hace
  que pdf-lib duplique fuentes e imágenes embebidas una vez por página y el archivo de
  salida se infla varias veces.
- La numeración se dibuja en coordenadas sin rotar. En una página girada hay que llevar
  el número al borde que quedó abajo *y* girar el texto, o sale de costado en el lugar
  equivocado. De ahí el switch por ángulo.

El giro del usuario se **suma** al que la página ya traía en el original; no lo reemplaza.

### Los bytes no se guardan en el estado

`Source` guarda la **ruta**, no el contenido. Las miniaturas se dibujan bajo demanda con
un `IntersectionObserver` (`useThumb`) porque un documento de 300 páginas son 300
renders, y se dibujan de a una: 30 renders en paralelo trababan la ventana.

`src/lib/pdf.ts` mantiene abierto un documento de pdf.js **por archivo**. Abrirlo es lo
caro; tenerlo vivo hace que recorrer las páginas sea instantáneo. Se cierra en
`closeSource()` cuando el archivo sale de la lista — el efecto que lo dispara está en
`useDocument`.

`pdf.js` **transfiere** el buffer que recibe en `getDocument({data})` y lo deja
inutilizable, por eso siempre se le pasa una copia (`new Uint8Array(bytes)`).

### Deshacer

`useDocument` es un reducer envuelto en `{ present, past }`. Solo son deshacibles las
acciones del usuario (`UNDOABLE`): los metadatos que van llegando de forma asíncrona
(`resolveSource`) no deben generar pasos de historial o Cmd+Z no haría nada visible.

### Deduplicación

`useDocument` mantiene un `Set` de rutas en un ref (`known`) como espejo síncrono del
estado. Es lo que evita duplicados cuando llegan dos "agregar" en el mismo tick, sin
leer estado dentro de un updater de React (que StrictMode invoca dos veces).

### La marca vive en un solo lugar

`src/lib/logo.ts` exporta el SVG de la marca como string, y lo consumen los dos únicos
lugares que lo necesitan: el header (`Icons.tsx`, vía `dangerouslySetInnerHTML`) y
`generate-icons.mjs`, que corre en node y no puede importar JSX. Estaban duplicados y se
fueron pareciendo cada vez menos: si retocás el dibujo, tocá ese archivo y corré
`pnpm icons`. El grosor de la grapa está calibrado para que sobreviva a 32 px.

### Dos drag & drop distintos

- **Archivos desde el sistema**: los entrega el runtime de Tauri vía
  `getCurrentWebview().onDragDropEvent` en `App.tsx`. El DOM nunca ve esos eventos, así
  que no busques `onDrop` para esto.
- **Reordenar tarjetas**: HTML5 drag & drop normal, dentro de `FileView` y `PageView`.
  En la vista de archivos se mueve el bloque entero; en la de páginas, la página sola (o
  toda la selección, si la que arrastrás es parte de ella).

El orden de la grilla **es** el orden de salida. Las flechas ◀ ▶ de las tarjetas de
archivo hacen lo mismo que arrastrar: existen porque el drag del webview puede fallar
según la plataforma y porque son accesibles con teclado. Si tocás una de las dos vías,
mantené la otra en pie.

### Permisos y scope de `fs` (donde se pierde más tiempo)

`src-tauri/capabilities/default.json` permite `$HOME/**`, `/Volumes/**`, `/media/**` y
`/mnt/**`. Cualquier API nueva de Tauri que llame el frontend hay que agregarla ahí o la
llamada se rechaza. Dos trampas ya pagadas:

- **Los archivos de entrada engañan.** El plugin `dialog` agrega al scope en runtime todo
  lo que el usuario elige, así que leerlos funciona aunque el scope del capability no los
  cubra. El que se valida contra el capability de verdad es el **archivo de salida**, que
  nunca pasó por un diálogo. Probar solo "agregar PDFs" no prueba nada del scope.
- **`requireLiteralLeadingDot`**. En unix el scope de `fs` exige punto literal por
  defecto, o sea que `$HOME/**` **no** matchea nada dentro de una carpeta oculta
  (`~/.loquesea/`) y guardar ahí falla con `forbidden path`. Se apaga en
  `tauri.conf.json` → `plugins.fs.requireLiteralLeadingDot: false`.

Ojo: en cuanto `tauri.conf.json` tiene una sección `plugins`, `generate_context!` genera
código que usa `serde_json`, y el crate tiene que declararlo en `Cargo.toml` aunque
ningún `.rs` lo importe. Sin eso no compila.

## Versionado

La versión está duplicada en `package.json`, `src-tauri/Cargo.toml` (+ `Cargo.lock`) y
`src-tauri/tauri.conf.json` — hoy `1.0.0` en los tres. Se suben juntas.
