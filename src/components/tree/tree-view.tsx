import FamilyTree from "@/components/tree/family-tree";
import type { PathStep } from "@/lib/family/kinship";
import type { ParentChild, Person, Photo, Union } from "@/lib/family/types";

export function TreeView(props: {
  people: Person[];
  links: ParentChild[];
  unions: Union[];
  photos: Photo[];
  steps: PathStep[];
}) {
  return (
    <div className="absolute inset-0">
      <FamilyTree {...props} />
    </div>
  );
}
