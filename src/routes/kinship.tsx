import { useMemo } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { PersonPicker } from "@/components/person-picker";
import { Pane } from "@/components/shell";
import { buttonClass } from "@/components/ui/button";
import { fullName, possessive } from "@/lib/family/format";
import { relate, tamilKinship } from "@/lib/family/kinship";
import { pairSearch } from "@/lib/family/search";
import { useFamilyStore } from "@/lib/family/store";

export const Route = createFileRoute("/kinship")({
  validateSearch: pairSearch,
  head: () => ({ meta: [{ title: "Kinship · Lineage" }] }),
  component: KinshipPage,
});

function KinshipPage() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate();
  const people = useFamilyStore((state) => state.people);
  const links = useFamilyStore((state) => state.links);
  const unions = useFamilyStore((state) => state.unions);
  const relation = useMemo(
    () => (a && b ? relate(a, b, people, links, unions) : null),
    [a, b, people, links, unions],
  );
  const personA = people.find((person) => person.id === a);
  const personB = people.find((person) => person.id === b);
  const canTry = people.some((person) => person.id === "rohan") && people.some((person) => person.id === "leela");

  function setPair(nextA?: string, nextB?: string) {
    void navigate({
      to: "/kinship",
      search: { a: nextA, b: nextB },
      replace: true,
    });
  }

  return (
    <Pane>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl tracking-tight">How are we related?</h1>
        <p className="mt-2 max-w-xl text-pretty text-muted">
          Pick two people. Lineage walks the shortest path through parents, children, and partnerships.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <PersonPicker label="Person A" value={a ?? ""} onChange={(id) => setPair(id, b)} />
          <button
            type="button"
            className={buttonClass("secondary", "px-3")}
            aria-label="Swap people"
            onClick={() => setPair(b, a)}
          >
            <ArrowLeftRight className="size-4" />
            <span className="sm:sr-only">Swap</span>
          </button>
          <PersonPicker label="Person B" value={b ?? ""} onChange={(id) => setPair(a, id)} />
        </div>
        {!a && !b && canTry ? (
          <button
            type="button"
            className="mt-4 text-sm text-accent-strong"
            onClick={() => setPair("rohan", "leela")}
          >
            Try Rohan and Leela
          </button>
        ) : null}

        {relation && personA && personB ? (
          <section className="silk-card mt-6 rounded-xl border border-line bg-surface p-5" aria-live="polite">
            {relation.kind === "related" ? (
              <>
                <p className="text-sm text-muted">
                  {fullName(personB)} is {possessive(fullName(personA))}
                </p>
                <h2 className="mt-1 font-display text-4xl text-accent-strong">{relation.label}</h2>
                {tamilKinship(relation.label) ? (
                  <p lang="ta" className="mt-1 text-lg text-gold">
                    {tamilKinship(relation.label)}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted">
                  {relation.steps.length} {relation.steps.length === 1 ? "step" : "steps"}
                  {relation.label === "Extended Relative"
                    ? ". No closer kinship name fits this branch."
                    : "."}
                </p>
                <ol className="mt-5 flex flex-wrap items-center gap-2" aria-label="Relationship path">
                  {relation.crumbs.map((crumb, index) => (
                    <li key={`${crumb.personId}-${index}`} className="flex items-center gap-2">
                      {crumb.via ? (
                        <>
                          <span className="text-sm text-muted" aria-hidden>
                            →
                          </span>
                          <span className="text-sm text-ink">{crumb.via}</span>
                          <span className="text-sm text-muted" aria-hidden>
                            →
                          </span>
                        </>
                      ) : null}
                      <Link
                        to="/people/$personId"
                        params={{ personId: crumb.personId }}
                        className="inline-flex min-h-11 items-center rounded-lg border border-line bg-canvas px-3 text-sm"
                      >
                        {crumb.name}
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link to="/" search={{ a, b }} className={`${buttonClass()} mt-5`}>
                  Show on tree
                </Link>
              </>
            ) : (
              <>
                <h2 className="font-display text-3xl">{relation.label}</h2>
                {tamilKinship(relation.label) ? (
                  <p lang="ta" className="mt-1 text-lg text-gold">
                    {tamilKinship(relation.label)}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted">
                  {relation.kind === "self"
                    ? "Choose two different people."
                    : relation.kind === "missing"
                      ? "One of these people is no longer in the directory."
                      : "No parent, child, or partnership path connects them yet."}
                </p>
              </>
            )}
          </section>
        ) : null}
      </div>
    </Pane>
  );
}
