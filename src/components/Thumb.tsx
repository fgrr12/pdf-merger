import type { Source } from "../types";
import { useThumb } from "../hooks/useThumb";
import { Alert } from "./Icons";

type Props = {
  source: Source;
  index: number;
  rotation: number;
};

export function Thumb({ source, index, rotation }: Props) {
  const { ref, thumb } = useThumb(source, index);
  // A 90 y 270 la imagen queda cruzada: sus límites se miden antes de rotar, así
  // que hay que intercambiarlos para que siga entrando en la tarjeta.
  const quarter = rotation % 180 !== 0;

  return (
    <div
      ref={ref}
      className="relative aspect-3/4 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          draggable={false}
          className="absolute left-1/2 top-1/2 object-contain transition-transform duration-200"
          style={{
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            maxWidth: quarter ? "133.33%" : "100%",
            maxHeight: quarter ? "75%" : "100%",
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          {source.error ? (
            <Alert className="h-7 w-7 text-rose-400" />
          ) : (
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-500 dark:border-zinc-700 dark:border-t-violet-400" />
          )}
        </div>
      )}
    </div>
  );
}
