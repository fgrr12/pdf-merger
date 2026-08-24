import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";

const SEP = /[\\/]/;

export function basename(path: string): string {
  const parts = path.split(SEP);
  return parts[parts.length - 1] || path;
}

export function dirname(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i <= 0 ? path : path.slice(0, i);
}

export function joinPath(dir: string, name: string): string {
  const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
  return dir.endsWith(sep) ? dir + name : dir + sep + name;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export const isPdf = (path: string) => path.toLowerCase().endsWith(".pdf");
export const isImage = (path: string) =>
  IMAGE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));
/** Lo que la app sabe meter en un PDF: otros PDFs y fotos. */
export const isSupported = (path: string) => isPdf(path) || isImage(path);

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`;
}

/** Los archivos sueltos de una carpeta, en orden alfabético. No entra a subcarpetas. */
export async function supportedInFolder(dir: string): Promise<string[]> {
  const entries = await readDir(dir);
  return entries
    .filter((e) => e.isFile && isSupported(e.name))
    .map((e) => joinPath(dir, e.name))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

/**
 * Expande lo que el usuario haya soltado o elegido: los archivos pasan tal cual,
 * las carpetas se abren. Lo que no sea PDF ni imagen se ignora en silencio.
 */
export async function expandPaths(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths) {
    if (isSupported(path)) {
      out.push(path);
      continue;
    }
    try {
      out.push(...(await supportedInFolder(path)));
    } catch {
      // No era una carpeta legible (o no era carpeta): no hay nada que agregar.
    }
  }
  return out;
}

export async function pickFiles(): Promise<string[]> {
  const picked = await open({
    multiple: true,
    directory: false,
    title: "Elegí PDFs o imágenes",
    filters: [
      { name: "PDF e imágenes", extensions: ["pdf", "jpg", "jpeg", "png"] },
      { name: "PDF", extensions: ["pdf"] },
      { name: "Imágenes", extensions: ["jpg", "jpeg", "png"] },
    ],
  });
  return picked ?? [];
}

export async function pickFolder(title: string): Promise<string | null> {
  return await open({ multiple: false, directory: true, title });
}
