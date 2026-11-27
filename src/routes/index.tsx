import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Kolam } from "@/components/monogram";
import { TreeView } from "@/components/tree/tree-view";
import { buttonClass } from "@/components/ui/button";
import { useEditor } from "@/lib/family/editor";
import { fullName, possessive } from "@/lib/family/format";
import { relate, tamilKinship, type PathStep } from "@/lib/family/kinship";
import { pairSearch } from "@/lib/family/search";
import { useFamilyStore } from "@/lib/family/store";

const noSteps: PathStep[] = [];

export const Route = createFileRoute("/")({
  validateSearch: pairSearch,
  head: () => ({ meta: [{ title: "Tree · Lineage" }] }),
  component: TreePage,
});

function TreePage() {
  const { a, b } = Route.useSearch();
  const people = useFamilyStore((state) => state.people);
  const links = useFamilyStore((state) => state.links);
  const unions = useFamilyStore((state) => state.unions);
  const photos = useFamilyStore((state) => state.photos);
  const openCreate = useEditor((state) => state.openCreate);
  const openRestore = useEditor((state) => state.openRestore);
  const relation = useMemo(
    () => (a && b ? relate(a, b, people, links, unions) : null),
    [a, b, people, links, unions],
  );
  const steps = relation?.kind === "related" ? relation.steps : noSteps;
  const personA = people.find((person) => person.id === a);
  const personB = people.find((person) => person.id === b);

  if (people.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center px-6 pb-20 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-accent-soft text-accent-strong">
            <Kolam className="size-10" />
          </div>
          <h1 className="font-display text-3xl tracking-tight">No one in the record yet</h1>
          <p className="mt-2 text-pretty text-muted">
            Add a person to start the tree, or bring back the sample family.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" className={buttonClass()} onClick={openCreate}>
              Add person
            </button>
            <button type="button" className={buttonClass("secondary")} onClick={openRestore}>
              Restore sample
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 top-0 bottom-16 md:bottom-0">
      <TreeView people={people} links={links} unions={unions} photos={photos} steps={steps} />
      {relation && personA && personB ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
          <div className="pointer-events-auto silk-card flex max-w-xl flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="min-w-0">
              {relation.kind === "related" ? (
                <>
                  <p className="text-sm text-muted">
                    {fullName(personB)} is {possessive(fullName(personA))}
                  </p>
                  <p className="font-display text-2xl text-accent-strong">{relation.label}</p>
                  {tamilKinship(relation.label) ? (
                    <p lang="ta" className="text-sm text-gold">
                      {tamilKinship(relation.label)}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-display text-xl text-ink">{relation.label}</p>
                  {tamilKinship(relation.label) ? (
                    <p lang="ta" className="text-sm text-gold">
                      {tamilKinship(relation.label)}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <Link to="/kinship" search={{ a, b }} className={buttonClass("secondary")}>
              Details
            </Link>
            <Link to="/" search={{}} className={buttonClass("ghost")}>
              Clear
            </Link>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
          <p className="rounded-full border border-line bg-surface px-3 py-2 text-xs text-muted">
            {people.length} people · Drag to move · Pinch or scroll to zoom
          </p>
        </div>
      )}
    </div>
  );
}
