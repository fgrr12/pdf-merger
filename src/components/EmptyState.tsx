import { Button } from "./ui";
import { FolderPlus, Pages, Plus } from "./Icons";

type Props = {
  onAddFiles: () => void;
  onAddFolder: () => void;
  dragging: boolean;
};

export function EmptyState({ onAddFiles, onAddFolder, dragging }: Props) {
  return (
    <div
      className={[
        "flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
        dragging
          ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
          : "border-zinc-300 dark:border-white/12",
      ].join(" ")}
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
        <Pages className="h-8 w-8" />
      </div>

      <h2 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-white">
        Arrastrá tus PDFs acá
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Se unen en el orden en que los pongas, y podés reacomodarlos arrastrando las tarjetas.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Button variant="primary" big onClick={onAddFiles}>
          <Plus />
          Agregar archivos
        </Button>
        <Button big onClick={onAddFolder}>
          <FolderPlus />
          Agregar carpeta
        </Button>
      </div>
    </div>
  );
}
