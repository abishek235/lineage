import { useMemo } from "react";
import { lifeTimeline } from "@/lib/family/occasions";
import { useFamilyStore } from "@/lib/family/store";

export function LifeTimeline({ personId }: { personId: string }) {
  const people = useFamilyStore((state) => state.people);
  const unions = useFamilyStore((state) => state.unions);
  const events = useFamilyStore((state) => state.events);
  const honorees = useFamilyStore((state) => state.honorees);
  const person = people.find((item) => item.id === personId);
  const entries = useMemo(
    () => (person ? lifeTimeline({ person, people, unions, events, honorees }) : []),
    [person, people, unions, events, honorees],
  );

  if (entries.length === 0) {
    return <p className="text-sm text-muted">No dated moments yet.</p>;
  }

  return (
    <ol className="grid gap-4 border-l border-line pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute top-1.5 -left-[1.35rem] size-2.5 rounded-full bg-accent-strong" aria-hidden />
          <p className="text-sm text-muted">{entry.label}</p>
          <p className="font-medium">{entry.title}</p>
          {entry.detail ? <p className="text-sm text-muted">{entry.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}
