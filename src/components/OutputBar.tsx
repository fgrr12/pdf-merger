import { basename } from "../lib/files";
import { Check, Folder } from "./Icons";
import { Button } from "./ui";

type Props = {
  name: string;
  onName: (value: string) => void;
  folder: string;
  onPickFolder: () => void;
  bookmarks: boolean;
  onBookmarks: (value: boolean) => void;
  pageNumbers: boolean;
  onPageNumbers: (value: boolean) => void;
  merging: boolean;
  progress: number;
  disabled: boolean;
  label: string;
  onRun: () => void;
};

export function OutputBar({
  name,
  onName,
  folder,
  onPickFolder,
  bookmarks,
  onBookmarks,
  pageNumbers,
  onPageNumbers,
  merging,
  progress,
  disabled,
  label,
  onRun,
}: Props) {
  return (
    <footer className="relative border-t border-zinc-200 bg-white/85 px-5 pb-3.5 pt-2.5 backdrop-blur dark:border-white/10 dark:bg-zinc-900/85">
      {merging && (
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-violet-500 transition-[width] duration-200"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      )}

      <div className="mb-2.5 flex flex-wrap items-center gap-4">
        <Toggle checked={bookmarks} onChange={onBookmarks} label="Índice de marcadores" />
        <Toggle checked={pageNumbers} onChange={onPageNumbers} label="Numerar páginas" />
      </div>

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

        <Button variant="primary" big disabled={disabled} onClick={onRun} className="min-w-52">
          {merging ? "Armando…" : label}
        </Button>
      </div>
    </footer>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] text-zinc-600 dark:text-zinc-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={[
          "grid h-4 w-4 place-items-center rounded-[5px] border transition",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-violet-500",
          checked
            ? "border-violet-600 bg-violet-600 text-white"
            : "border-zinc-300 dark:border-white/20",
        ].join(" ")}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      {label}
    </label>
  );
}
