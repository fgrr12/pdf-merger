# Grapa

App de escritorio para armar un PDF a partir de otros PDFs e imágenes: unir,
reordenar por archivo o por página, girar, extraer y exportar. Arrastrás los
archivos, los acomodás mirando la miniatura de cada uno, y listo.

Tauri 2 + React 19 + TypeScript + Tailwind 4.

```bash
pnpm install
pnpm t:d     # desarrollo
pnpm t:b     # empaquetar
pnpm check   # chequeo del armado del PDF
```

## Distribución

`pnpm t:b` deja todo en `src-tauri/target/release/bundle/`. Cada plataforma da
las dos cosas: algo que se ejecuta sin instalar y algo que instala.

| | Se abre sin instalar | Instala |
|---|---|---|
| **macOS** | `macos/Grapa.app` — corre desde donde esté (Descargas, un pendrive) | `dmg/Grapa_x.y.z_*.dmg` — la ventana con el ícono y el alias a Aplicaciones |
| **Windows** | `../release/grapa.exe` — el ejecutable suelto, fuera de `bundle/` | `nsis/*-setup.exe` (pregunta si es para vos o para toda la máquina) y `msi/*.msi` |
| **Linux** | `appimage/*.AppImage` — `chmod +x` y doble clic | `deb/*.deb`, `rpm/*.rpm` |

Dos cosas que conviene saber antes de mandárselo a alguien:

- **Solo se puede empaquetar para la plataforma en la que estás.** Para las tres
  hace falta CI (por ejemplo `tauri-apps/tauri-action` en GitHub Actions con los
  tres sistemas en la matriz).
- **Sin firmar, el sistema operativo desconfía.** En macOS aparece "no se puede
  abrir porque no se puede verificar el desarrollador" (se saltea con clic
  derecho → Abrir); en Windows salta SmartScreen ("Más información" → "Ejecutar
  de todas formas"). Se arregla firmando: Apple Developer Program para macOS,
  un certificado de firma de código para Windows. En Linux no hay nada de esto.
- En **Windows** el `.exe` suelto necesita WebView2, que ya viene en Windows 11
  y en Windows 10 al día. Los instaladores lo resuelven solos.
- En **macOS** el build sale para la arquitectura de la máquina. Para que ande
  en Intel y en Apple Silicon con un solo archivo:
  `pnpm t:b --target universal-apple-darwin`.

La versión anterior en Python/tkinter quedó en [`legacy/`](legacy/).
