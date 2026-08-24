export type SourceKind = "pdf" | "image";

/** Un archivo que el usuario agregó. No guarda el contenido, solo la ruta. */
export type Source = {
  id: string;
  path: string;
  name: string;
  size: number;
  kind: SourceKind;
  pageCount: number;
  loading: boolean;
  error?: string;
};

/**
 * Una página del documento que se está armando. La lista de páginas es la
 * verdad: la vista de archivos se deriva de ella, no al revés.
 */
export type Page = {
  id: string;
  sourceId: string;
  /** Índice 0-based dentro del archivo original. Las imágenes siempre son 0. */
  index: number;
  /** Giro agregado por el usuario, encima del que ya traiga la página: 0, 90, 180 o 270. */
  rotation: number;
};

/**
 * Corrida de páginas consecutivas del mismo archivo: es lo que se ve como
 * tarjeta en la vista de archivos. Mientras nadie intercale páginas a mano,
 * hay exactamente un bloque por archivo.
 */
export type Block = {
  key: string;
  source: Source;
  pages: Page[];
  /** Posición de la primera página del bloque en la lista global. */
  start: number;
};
