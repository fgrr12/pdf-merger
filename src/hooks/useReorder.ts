import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/** Distancia en píxeles a partir de la cual un click pasa a ser un arrastre. */
const DRAG_THRESHOLD = 6;

const SLOT = "data-slot-index";

type Options = {
  /** Soltó sobre la posición `to`. `key` identifica lo que se estaba arrastrando. */
  onCommit: (key: string, to: number) => void;
  /** Apretó y soltó sin moverse: es un click. */
  onTap?: (index: number, extend: boolean) => void;
};

/**
 * Reordenar arrastrando, con eventos de puntero en vez de HTML5 drag & drop.
 *
 * No es un capricho: con `dragDropEnabled: true` (que es lo que hace que se
 * puedan soltar archivos sobre la ventana) el manejador nativo de Tauri se traga
 * los eventos de drag del webview, y arrastrar tarjetas no hacía nada. Su
 * documentación solo advierte de esto en Windows, pero en macOS pasa igual.
 * Apagarlo arreglaba el arrastre y rompía el soltar archivos; con punteros
 * andan las dos cosas.
 */
export function useReorder({ onCommit, onTap }: Options) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; key: string; index: number } | null>(null);
  const moved = useRef(false);

  const reset = useCallback(() => {
    start.current = null;
    moved.current = false;
    setDragKey(null);
    setOverIndex(null);
  }, []);

  const slotAt = (x: number, y: number): number | null => {
    const element = document.elementFromPoint(x, y)?.closest(`[${SLOT}]`);
    const value = element?.getAttribute(SLOT);
    return value === null || value === undefined ? null : Number(value);
  };

  const handlers = useCallback(
    (key: string, index: number) => ({
      [SLOT]: index,
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        // Los botones de la tarjeta (girar, quitar) se manejan solos.
        if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
        start.current = { x: e.clientX, y: e.clientY, key, index };
        moved.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        const from = start.current;
        if (!from) return;
        if (!moved.current) {
          if (Math.hypot(e.clientX - from.x, e.clientY - from.y) < DRAG_THRESHOLD) return;
          moved.current = true;
          setDragKey(from.key);
        }
        setOverIndex(slotAt(e.clientX, e.clientY));
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
        const from = start.current;
        if (!from) return;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        if (moved.current) {
          const to = slotAt(e.clientX, e.clientY);
          if (to !== null && to !== from.index) onCommit(from.key, to);
        } else {
          onTap?.(from.index, e.shiftKey);
        }
        reset();
      },
      onPointerCancel: reset,
    }),
    [onCommit, onTap, reset],
  );

  return { dragKey, overIndex, handlers };
}
