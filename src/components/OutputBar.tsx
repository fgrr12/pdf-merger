import { basename } from "../lib/files";
import { Folder } from "./Icons";
import { Button } from "./ui";

type Props = {
  name: string;
  onName: (value: string) => void;
  folder: string;
  onPickFolder: () => void;
  merging: boolean;
  progress: number;
  disabled: boolean;
  count: number;
  onMerge: () => void;
};

export function OutputBar({
  name,
  onName,
  folder,
  onPickFolder,
  merging,
  progress,
  disabled,
  count,
  onMerge,
}: Props) {
  return (
    <footer className="relative border-t border-zinc-200 bg-white/85 px-5 py-3.5 backdrop-blur dark:border-white/10 dark:bg-zinc-900/85">
      {merging && (
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-violet-500 transition-[width] duration-200"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Nombre del PDF final"
            spellCheck={false}
            aria-label="Nombre del PDF final"
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-2 focus:outline-offset-1 focus:outline-violet-500/40 dark:border-white/12 dark:bg-zinc-950 dark:text-white"
          />
          <button
            type="button"
            onClick={onPickFolder}
            title={folder || "Elegir carpeta de destino"}
            className="flex h-11 max-w-[13rem] items-center gap-2 rounded-xl border border-zinc-200 px-3.5 text-[13px] text-zinc-600 transition hover:border-violet-400 hover:text-violet-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-white/12 dark:text-zinc-300 dark:hover:text-violet-300"
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="truncate">{folder ? basename(folder) : "Elegir carpeta"}</span>
          </button>
        </div>

        <Button variant="primary" big disabled={disabled} onClick={onMerge} className="min-w-44">
          {merging ? "Uniendo…" : `Unir ${count} PDF${count === 1 ? "" : "s"}`}
        </Button>
      </div>
    </footer>
  );
}
