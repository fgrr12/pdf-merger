# CLAUDE.md

## Qué es esto

**Grapa** — app de escritorio (Tauri 2) para unir PDFs. Tauri v2 + React 19 + TS +
Tailwind 4, `pnpm`. UI en español. La versión vieja en Python/tkinter está en
`legacy/` y ya no se mantiene.

## Comandos

```bash
pnpm install
pnpm t:d              # tauri dev (levanta Vite en el puerto fijo 1420)
pnpm t:b              # tauri build → src-tauri/target/release/bundle/
pnpm build            # typecheck (tsc) + vite build, solo frontend
pnpm check            # chequeo del merge (node corre el .ts directo, sin framework)
pnpm icons            # regenera src-tauri/icons/ desde el SVG embebido en generate-icons.mjs
```

No hay linter. Las dos verificaciones automáticas son `pnpm build` (tsc estricto, con
`noUnusedLocals`/`noUnusedParameters`) y `pnpm check`; si tocaste Rust, `cargo check`
desde `src-tauri/`.

`scripts/check-merge.mjs` arma PDFs de páginas cuadradas de distinto tamaño y verifica
que salgan en orden y completas. Por eso `src/lib/merge.ts` no importa nada de Tauri ni
de Vite: es lo único que node puede ejecutar tal cual. Si le agregás una dependencia de
esas, el chequeo deja de correr.

## Arquitectura

### Rust no hace nada

`src-tauri/src/lib.rs` solo registra los plugins `dialog`, `fs` y `opener`. **Toda** la
lógica de PDF vive en el frontend: `pdf-lib` une y `pdf.js` (`pdfjs-dist`) dibuja las
miniaturas. Antes de agregar un comando de Tauri, fijate si no se resuelve en JS — la
decisión acá fue no tener capa de IPC ni dependencias de PDF en Rust.

`src/lib/merge.ts` (el núcleo, sin dependencias del entorno) recibe un iterable
asíncrono en vez de un array: así `pdf.ts` va leyendo de a un archivo y nunca están
todos los buffers en memoria a la vez.

### Los bytes no se guardan en el estado

`Doc` (`src/types.ts`) guarda la **ruta**, no el contenido. Cada archivo se lee dos
veces: una en `inspect()` para contar páginas y sacar la miniatura, otra en `merge()`.
Es a propósito — con 40 PDFs en la lista, tener todos los buffers en memoria no vale la
pena para una operación que se hace una vez.

`pdf.js` **transfiere** el buffer que recibe en `getDocument({data})` y lo deja
inutilizable, por eso `inspect()` siempre le pasa una copia (`new Uint8Array(bytes)`).

`inspect()` corre de a un archivo por vez (`useDocuments.add`): cada uno levanta un
worker de pdf.js. La UI no espera — las tarjetas aparecen en estado `loading` y se van
completando.

### Dos drag & drop distintos

- **Archivos desde el sistema**: los entrega el runtime de Tauri vía
  `getCurrentWebview().onDragDropEvent` en `App.tsx`. El DOM nunca ve esos eventos, así
  que no busques `onDrop` para esto.
- **Reordenar tarjetas**: HTML5 drag & drop normal, dentro de `DocGrid.tsx`.

El orden de la grilla **es** el orden del merge. Las flechas ◀ ▶ de cada tarjeta hacen
lo mismo que arrastrar: existen porque el drag del webview puede fallar según la
plataforma y porque son accesibles con teclado. Si tocás una de las dos vías, mantené
la otra en pie.

### Deduplicación

`useDocuments` mantiene un `Set` de rutas en un ref (`known`) como espejo síncrono del
estado. Es lo que evita duplicados cuando llegan dos "agregar" en el mismo tick, sin
leer estado dentro de un updater de React (que StrictMode invoca dos veces).

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
