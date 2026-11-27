import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Portrait } from "@/components/photos";
import { Pane } from "@/components/shell";
import { buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { useEditor } from "@/lib/family/editor";
import { byName, cardYears, fullName, initials } from "@/lib/family/format";
import { useFamilyStore } from "@/lib/family/store";
import type { ContactInfo, Person } from "@/lib/family/types";

export const Route = createFileRoute("/directory")({
  head: () => ({ meta: [{ title: "Directory · Lineage" }] }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const people = useFamilyStore((state) => state.people);
  const contacts = useFamilyStore((state) => state.contacts);
  const photos = useFamilyStore((state) => state.photos);
  const openRestore = useEditor((state) => state.openRestore);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((person) => !q || haystack(person, contacts).includes(q))
      .sort(byName);
  }, [people, contacts, query]);
  const sampleLoaded = people.some((person) => person.id === "venkatesh");

  return (
    <Pane>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Directory</h1>
            <p className="mt-1 text-sm text-muted">
              {query.trim()
                ? `${shown.length} of ${people.length}`
                : `${people.length} ${people.length === 1 ? "person" : "people"}`}
            </p>
          </div>
          <button type="button" className={buttonClass("ghost")} onClick={openRestore}>
            Restore sample
          </button>
        </div>
        {sampleLoaded ? (
          <p className="mt-3 max-w-2xl text-sm text-pretty text-muted">
            A sample family is loaded so you can try the tree and kinship finder. Edit anyone, or add your own.
          </p>
        ) : null}
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names, emails, phones, addresses"
            className={`${controlClass} pl-10`}
            aria-label="Search the directory"
          />
        </div>
        {shown.length === 0 ? (
          <p className="mt-8 text-sm text-muted">No one matches that search.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((person) => {
              const reach = primaryReach(contacts, person.id);
              const portrait = photos.find((photo) => photo.personId === person.id && photo.isPrimary)
                ?? photos.find((photo) => photo.personId === person.id);
              return (
                <li key={person.id}>
                  <Link
                    to="/people/$personId"
                    params={{ personId: person.id }}
                    className="silk-card flex h-full gap-3 rounded-xl border border-line bg-surface p-4 transition-colors duration-200 hover:border-accent"
                  >
                    <Portrait
                      photoId={portrait?.id}
                      initials={initials(person.firstName, person.lastName)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg leading-tight">{fullName(person)}</span>
                      <span className="mt-1 block text-sm text-muted">{cardYears(person)}</span>
                      {person.maidenName ? (
                        <span className="mt-1 block truncate text-sm text-muted">
                          Maiden name {person.maidenName}
                        </span>
                      ) : null}
                      {reach ? (
                        <span className="mt-2 block truncate text-sm text-ink">{reach.value}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Pane>
  );
}

function haystack(person: Person, contacts: ContactInfo[]): string {
  return [
    person.firstName,
    person.lastName,
    person.maidenName ?? "",
    person.bio ?? "",
    ...contacts.filter((item) => item.personId === person.id).map((item) => `${item.label} ${item.value}`),
  ]
    .join(" ")
    .toLowerCase();
}

function primaryReach(contacts: ContactInfo[], personId: string): ContactInfo | undefined {
  const list = contacts.filter((item) => item.personId === personId && item.type !== "ADDRESS");
  return (
    list.find((item) => item.isPrimary && item.type === "PHONE") ??
    list.find((item) => item.isPrimary && item.type === "EMAIL") ??
    list.find((item) => item.type === "PHONE") ??
    list.find((item) => item.type === "EMAIL")
  );
}
