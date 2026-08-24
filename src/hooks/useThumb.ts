import { useEffect, useRef, useState } from "react";

import type { Source } from "../types";
import { peekThumb, thumbFor } from "../lib/pdf";

/**
 * Miniatura de una página, dibujada recién cuando la tarjeta está por entrar en
 * pantalla. Un documento de 300 páginas son 300 renders: hacerlos todos al
 * abrir la vista de páginas trababa la ventana varios segundos.
 */
export function useThumb(source: Source, index: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState(() => peekThumb(source, index));

  useEffect(() => {
    setThumb(peekThumb(source, index));
  }, [source, index]);

  useEffect(() => {
    if (thumb || source.loading || source.error) return;
    const element = ref.current;
    if (!element) return;

    let alive = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        thumbFor(source, index)
          .then((value) => alive && setThumb(value))
          .catch(() => {});
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);

    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [source, index, thumb]);

  return { ref, thumb };
}
