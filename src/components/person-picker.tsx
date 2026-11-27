import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { controlClass } from "@/components/ui/field";
import { byName, cardYears, fullName } from "@/lib/family/format";
import { useFamilyStore } from "@/lib/family/store";
import { cn } from "@/lib/utils";

function useChooserHost(open: boolean) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setHost(null);
      return;
    }
    const dialog = anchorRef.current?.closest("[data-lineage-dialog]");
    setHost(dialog instanceof HTMLElement ? dialog : document.body);
  }, [open]);
  return { anchorRef, host };
}

function matches(query: string, person: { firstName: string; lastName: string; maidenName?: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fullName(person).toLowerCase().includes(q) || (person.maidenName ?? "").toLowerCase().includes(q);
}

export function PersonPicker({
  label,
  value,
  onChange,
  excludeIds = [],
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  excludeIds?: string[];
}) {
  const people = useFamilyStore((state) => state.people);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { anchorRef, host } = useChooserHost(open);
  const selected = people.find((person) => person.id === value);
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);
  const options = people.filter((person) => !exclude.has(person.id) && matches(query, person)).sort(byName);
  const inDialog = host?.hasAttribute("data-lineage-dialog") ?? false;

  return (
    <div ref={anchorRef}>
      <span className="text-sm font-medium text-ink" id={`${label}-picker`}>
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${label}-picker`}
        aria-expanded={open}
        className={cn(controlClass, "mt-1.5 flex items-center justify-between text-left")}
        onClick={() => setOpen(true)}
      >
        <span className={selected ? "truncate" : "truncate text-muted"}>
          {selected ? fullName(selected) : "Choose a person"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>
      {open && host
        ? createPortal(
            <div
              className={cn(
                "z-[100] flex flex-col bg-surface p-4",
                inDialog ? "absolute inset-0" : "fixed inset-0",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-2xl tracking-tight">{label}</p>
                <button
                  type="button"
                  className="grid size-11 place-items-center rounded-lg text-muted"
                  aria-label="Close"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <X className="size-5" />
                </button>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the family"
                className={`${controlClass} mt-3`}
                aria-label={`Search for ${label}`}
              />
              <ul className="mt-3 min-h-0 flex-1 overflow-auto">
                {options.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left text-sm",
                        person.id === value && "bg-accent-soft",
                      )}
                      onClick={() => {
                        onChange(person.id);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className="truncate">{fullName(person)}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted">{cardYears(person)}</span>
                    </button>
                  </li>
                ))}
                {options.length === 0 ? <li className="px-2 py-3 text-sm text-muted">No matches</li> : null}
              </ul>
            </div>,
            host,
          )
        : null}
    </div>
  );
}

export function PeoplePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const people = useFamilyStore((state) => state.people);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { anchorRef, host } = useChooserHost(open);
  const selected = people.filter((person) => value.includes(person.id)).sort(byName);
  const options = people.filter((person) => matches(query, person)).sort(byName);
  const inDialog = host?.hasAttribute("data-lineage-dialog") ?? false;
  const summary = selected.length === 0 ? "Choose people" : selected.map((person) => fullName(person)).join(", ");

  return (
    <div ref={anchorRef}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        className={cn(controlClass, "mt-1.5 flex items-center justify-between text-left")}
        onClick={() => setOpen(true)}
      >
        <span className={selected.length ? "truncate" : "truncate text-muted"}>{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>
      {open && host
        ? createPortal(
            <div
              className={cn(
                "z-[100] flex flex-col bg-surface p-4",
                inDialog ? "absolute inset-0" : "fixed inset-0",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-2xl tracking-tight">{label}</p>
                <button type="button" className="text-sm font-medium text-accent-strong" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the family"
                className={`${controlClass} mt-3`}
                aria-label={`Search for ${label}`}
              />
              <ul className="mt-3 min-h-0 flex-1 overflow-auto">
                {options.map((person) => {
                  const checked = value.includes(person.id);
                  return (
                    <li key={person.id}>
                      <label className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange(checked ? value.filter((id) => id !== person.id) : [...value, person.id])
                          }
                        />
                        <span className="truncate">{fullName(person)}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted">{cardYears(person)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>,
            host,
          )
        : null}
    </div>
  );
}
