# CLAUDE.md

## What this is

Single-file Tkinter desktop app (`pdf_merger.py`, ~600 lines) that merges PDFs.
Spanish-language UI, aimed at non-technical users (numbered PASO 1-4 steps, emoji, help window).

Run it: `python pdf_merger.py`. No build, no tests, no packaging.

## Dependencies

`pip install -r requirements.txt` (unpinned).

`PyMuPDF`/`Pillow` are imported lazily in `lazy_import_preview_libs()`; if missing, only
preview breaks and the app shows an install hint.

## Structure

Module-level script, no classes, no `if __name__ == "__main__"`. Order matters:
imports → global state → functions → widget construction → `app.mainloop()`.
Functions reference widgets (`listbox`, `status_label`, `merge_btn`, …) that are created
*below* them; this only works because they run after `mainloop()` starts. Keep new UI
code in that same layout, and don't move function definitions after widget creation.

Global state: `pdf_files` (ordered list of absolute paths) and `preview_window`.

**Invariant: `pdf_files` and the `listbox` rows must stay index-aligned.** Every add,
remove, clear, and drag-reorder mutates both in the same operation (`drop_files`,
`add_pdfs`, `add_folder`, `remove_selected`, `clear_list`, `on_drag_drop`). Merge order
is the listbox order.

After changing the file list, call `update_counter()` and `update_output_name()`.

## Behavior worth knowing

- Output is written to `os.getcwd()`, not a chosen directory.
- Default output name is auto-filled once (`PDFs_Unidos_<timestamp>.pdf`) and only when the
  entry is empty.
- Duplicate paths are silently skipped on add.
- `open_folder()` branches per platform (Windows/Darwin/other).
- UI strings are Spanish; keep new strings Spanish and in the same plain-language tone.
