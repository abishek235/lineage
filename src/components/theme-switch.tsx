import { useEffect, useId, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  applyMode,
  applyTheme,
  isMode,
  isTheme,
  THEME_IDS,
  THEME_LABELS,
  THEME_SWATCH,
  type ModeId,
  type ThemeId,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeSwitch() {
  const [theme, setTheme] = useState<ThemeId>("sage");
  const [mode, setMode] = useState<ModeId>("light");
  const [open, setOpen] = useState(false);
  const paletteId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (isTheme(current)) setTheme(current);
    const stored = document.documentElement.dataset.mode;
    if (isMode(stored)) setMode(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(id: ThemeId) {
    applyTheme(id);
    setTheme(id);
    setOpen(false);
  }

  function toggleMode() {
    const next: ModeId = mode === "dark" ? "light" : "dark";
    applyMode(next);
    setMode(next);
  }

  const swatches = THEME_IDS.map((id) => {
    const selected = theme === id;
    return (
      <button
        key={id}
        type="button"
        title={THEME_LABELS[id]}
        aria-label={THEME_LABELS[id]}
        aria-pressed={selected}
        onClick={() => choose(id)}
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-shadow duration-200",
          selected && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
        )}
      >
        <span className={cn("size-6 rounded-full", THEME_SWATCH[id])} />
      </button>
    );
  });

  return (
    <div className="flex items-center" ref={rootRef}>
      <button
        type="button"
        title={mode === "dark" ? "Light" : "Dark"}
        aria-label={mode === "dark" ? "Switch to light" : "Switch to dark"}
        aria-pressed={mode === "dark"}
        onClick={toggleMode}
        className="grid size-11 place-items-center rounded-full text-ink transition-colors duration-200 hover:bg-accent-soft"
      >
        {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      <div className="relative md:hidden">
        <button
          type="button"
          aria-label="Color theme"
          aria-expanded={open}
          aria-controls={paletteId}
          onClick={() => setOpen((value) => !value)}
          className="grid size-11 place-items-center rounded-full"
        >
          <span className={cn("size-6 rounded-full ring-2 ring-ink ring-offset-2 ring-offset-surface", THEME_SWATCH[theme])} />
        </button>
        {open ? (
          <div
            id={paletteId}
            className="absolute top-12 right-0 z-40 flex rounded-full border border-line bg-surface p-1"
          >
            {swatches}
          </div>
        ) : null}
      </div>
      <div className="hidden items-center md:flex" role="group" aria-label="Color theme">
        {swatches}
      </div>
    </div>
  );
}
