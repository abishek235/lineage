import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PeoplePicker } from "@/components/person-picker";
import { PhotoGallery } from "@/components/photos";
import { Pane } from "@/components/shell";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { fullName, formatFullDate } from "@/lib/family/format";
import { EVENT_PRESETS, categoryLabel, todayIso, upcomingItems } from "@/lib/family/occasions";
import { useFamilyStore } from "@/lib/family/store";
import type { CulturalEvent, EventCategory, EventInput } from "@/lib/family/types";

export const Route = createFileRoute("/occasions")({
  validateSearch: (search: Record<string, unknown>) => ({
    honoree: typeof search.honoree === "string" && search.honoree ? search.honoree : undefined,
  }),
  head: () => ({ meta: [{ title: "Events · Lineage" }] }),
  component: OccasionsPage,
});

function OccasionsPage() {
  const { honoree } = Route.useSearch();
  const people = useFamilyStore((state) => state.people);
  const unions = useFamilyStore((state) => state.unions);
  const events = useFamilyStore((state) => state.events);
  const honorees = useFamilyStore((state) => state.honorees);
  const [editing, setEditing] = useState<string | "new" | null>(honoree ? "new" : null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const today = todayIso();
  const upcoming = useMemo(
    () => upcomingItems({ people, unions, events, honorees, today }),
    [people, unions, events, honorees, today],
  );
  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const ordered = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const existing = events.find((event) => event.id === editing);

  return (
    <Pane>
      <div className="mx-auto grid max-w-3xl gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Events</h1>
            <p className="mt-2 max-w-xl text-pretty text-muted">
              Birthdays, anniversaries, and occasions in the next 60 days.{" "}
              <Link to="/record" className="text-accent-strong">
                Back up the record or email reminders
              </Link>
              .
            </p>
          </div>
          <Button onClick={() => setEditing("new")}>Add occasion</Button>
        </div>

        <section className="silk-card rounded-xl border border-line bg-surface p-4 md:p-5">
          <h2 className="font-display text-xl">Coming up</h2>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing in the next 60 days.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {upcoming.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-muted">
                      {formatFullDate(item.date)}
                      {item.days === 0 ? " · today" : item.days === 1 ? " · tomorrow" : ` · in ${item.days} days`}
                    </p>
                    {item.personId ? (
                      <Link to="/people/$personId" params={{ personId: item.personId }} className="font-medium">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.title}</p>
                    )}
                    <p className="text-sm text-muted">{item.detail}</p>
                  </div>
                  {item.milestone ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong">
                      {item.milestone}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="font-display text-xl">Occasions</h2>
          {ordered.length === 0 ? (
            <p className="text-sm text-muted">No occasions recorded.</p>
          ) : (
            ordered.map((event) => {
              const names = honorees
                .filter((item) => item.eventId === event.id)
                .map((item) => byId.get(item.personId))
                .filter((person) => person)
                .map((person) => fullName(person!));
              return (
                <article key={event.id} className="silk-card rounded-xl border border-line bg-surface p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-2xl">{event.title}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {formatFullDate(event.eventDate)} · {categoryLabel(event.category)}
                        {event.isAnnualRecurring ? " · every year" : ""}
                      </p>
                      {names.length > 0 ? <p className="mt-1 text-sm">{names.join(", ")}</p> : null}
                      {event.location ? <p className="mt-1 text-sm text-muted">{event.location}</p> : null}
                      {event.description ? <p className="mt-2 text-sm text-pretty">{event.description}</p> : null}
                      <p className="mt-2 text-sm text-muted">
                        {event.notifyDaysBefore < 0
                          ? "No reminder"
                          : `Reminder ${event.notifyDaysBefore} days before`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setEditing(event.id)}>
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => setPendingDelete(event.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium">Ceremony photos</p>
                    <div className="mt-2">
                      <PhotoGallery eventId={event.id} />
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
      <EventDialog
        open={editing !== null}
        event={existing}
        initialHonoree={editing === "new" ? honoree : undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this occasion?"
        body="The people stay in the record. Ceremony photos for this occasion are removed from this device."
        confirmLabel="Delete occasion"
        onConfirm={() => {
          if (pendingDelete) useFamilyStore.getState().deleteEvent(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </Pane>
  );
}

function EventDialog({
  open,
  event,
  initialHonoree,
  onOpenChange,
}: {
  open: boolean;
  event?: CulturalEvent;
  initialHonoree?: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={event ? "Edit occasion" : "Add an occasion"}
      description="A ritual, milestone, or ceremony. Tag everyone it honors."
    >
      {open ? (
        <EventForm
          event={event}
          initialHonoree={initialHonoree}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Modal>
  );
}

function EventForm({
  event,
  initialHonoree,
  onClose,
}: {
  event?: CulturalEvent;
  initialHonoree?: string;
  onClose: () => void;
}) {
  const people = useFamilyStore((state) => state.people);
  const unions = useFamilyStore((state) => state.unions);
  const honorees = useFamilyStore((state) => state.honorees);
  const saveEvent = useFamilyStore((state) => state.saveEvent);
  const existingIds = event
    ? honorees.filter((item) => item.eventId === event.id).map((item) => item.personId)
    : initialHonoree
      ? [initialHonoree]
      : [];
  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(event?.category ?? "CUSTOM");
  const [eventDate, setEventDate] = useState(event?.eventDate ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [annual, setAnnual] = useState(event?.isAnnualRecurring ?? false);
  const [notify, setNotify] = useState(String(event?.notifyDaysBefore ?? 30));
  const [unionId, setUnionId] = useState(event?.unionId ?? "");
  const [selected, setSelected] = useState<string[]>(existingIds);
  const [error, setError] = useState("");

  function applyPreset(presetTitle: string, presetCategory: EventCategory) {
    setCategory(presetCategory);
    setTitle(presetTitle === "Custom" ? "" : presetTitle);
  }

  function submit() {
    const input: EventInput = {
      title,
      category,
      eventDate,
      location,
      description,
      isAnnualRecurring: annual,
      notifyDaysBefore: Number(notify),
      unionId: unionId || undefined,
      honoreeIds: selected,
    };
    const result = saveEvent(input, event?.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap gap-2">
        {EVENT_PRESETS.map((preset) => (
          <button
            key={preset.title}
            type="button"
            className={buttonClass(title === preset.title || (preset.title === "Custom" && category === "CUSTOM" && !title) ? "secondary" : "ghost")}
            onClick={() => applyPreset(preset.title, preset.category)}
          >
            {preset.title}
          </button>
        ))}
      </div>
      <Field label="Title">
        <input className={controlClass} value={title} maxLength={80} onChange={(input) => setTitle(input.target.value)} />
      </Field>
      <Field label="Date">
        <input className={controlClass} type="date" value={eventDate} onChange={(input) => setEventDate(input.target.value)} />
      </Field>
      <PeoplePicker label="Honorees" value={selected} onChange={setSelected} />
      <Field label="Place" hint="Optional">
        <input className={controlClass} value={location} maxLength={120} onChange={(input) => setLocation(input.target.value)} />
      </Field>
      <Field label="Notes" hint="Optional">
        <textarea className={`${controlClass} min-h-24 py-2`} maxLength={2000} value={description} onChange={(input) => setDescription(input.target.value)} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={annual} onChange={(input) => setAnnual(input.target.checked)} />
        Repeats every year
      </label>
      <Field label="Remind me" hint="Days before. Use -1 to turn the reminder off.">
        <input
          className={controlClass}
          inputMode="numeric"
          value={notify}
          onChange={(input) => setNotify(input.target.value)}
        />
      </Field>
      <Field label="Linked partnership" hint="Optional">
        <select className={controlClass} value={unionId} onChange={(input) => setUnionId(input.target.value)}>
          <option value="">None</option>
          {unions.map((union) => {
            const left = people.find((person) => person.id === union.partner1Id);
            const right = people.find((person) => person.id === union.partner2Id);
            if (!left || !right) return null;
            return (
              <option key={union.id} value={union.id}>
                {fullName(left)} & {fullName(right)}
              </option>
            );
          })}
        </select>
      </Field>
      {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{event ? "Save changes" : "Add occasion"}</Button>
      </div>
    </form>
  );
}
