export type Doc = {
  id: string;
  /** Ruta absoluta. Es la identidad real del documento: no se repite en la lista. */
  path: string;
  name: string;
  size: number;
  /** 0 mientras se está inspeccionando el archivo. */
  pages: number;
  /** data URL de la primera página, o null si aún no se generó / falló. */
  thumb: string | null;
  loading: boolean;
  error?: string;
};
