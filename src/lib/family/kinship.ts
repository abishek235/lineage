import { fullName } from "@/lib/family/format";
import type { Gender, ParentChild, ParentChildType, Person, Union } from "@/lib/family/types";

export type StepKind = "parent" | "child" | "spouse";

export interface PathStep {
  fromId: string;
  toId: string;
  kind: StepKind;
  linkType?: ParentChildType;
}

export interface Crumb {
  personId: string;
  name: string;
  via?: string;
}

export interface Relation {
  kind: "self" | "missing" | "unrelated" | "related";
  label: string;
  steps: PathStep[];
  crumbs: Crumb[];
}

const TAMIL_KIN: Record<string, string> = {
  Spouse: "துணை",
  Parent: "பெற்றோர்",
  Child: "பிள்ளை",
  Grandparent: "தாத்தா / பாட்டி",
  Grandchild: "பேரன் / பேத்தி",
  "Great-Grandparent": "கொள்ளுப் பாட்டன்",
  "Great-Grandchild": "கொள்ளுப் பேரன்",
  Sibling: "உடன்பிறந்தவர்",
  Aunt: "அத்தை",
  Uncle: "மாமா",
  "Aunt/Uncle": "அத்தை / மாமா",
  Niece: "மருமகள்",
  Nephew: "மருமகன்",
  "Niece/Nephew": "மருமகன் / மருமகள்",
  "First Cousin": "உறவினர்",
  "Parent-in-Law": "மாமனார் / மாமியார்",
  "Child-in-Law": "மருமகன் / மருமகள்",
  "Sibling-in-Law": "மைத்துனர் / மைத்துனி",
  "Extended Relative": "தூரத்து உறவு",
  "Same person": "அதே நபர்",
  "Not in the record": "பதிவில் இல்லை",
  "Not linked": "தொடர்பு இல்லை",
};

export function tamilKinship(label: string): string | undefined {
  return TAMIL_KIN[label];
}

interface Adj {
  toId: string;
  kind: StepKind;
  linkType?: ParentChildType;
}

export function relate(
  fromId: string,
  toId: string,
  people: Person[],
  links: ParentChild[],
  unions: Union[],
): Relation {
  if (fromId === toId) {
    return { kind: "self", label: "Same person", steps: [], crumbs: [] };
  }
  const from = people.find((person) => person.id === fromId);
  const to = people.find((person) => person.id === toId);
  if (!from || !to) {
    return { kind: "missing", label: "Not in the record", steps: [], crumbs: [] };
  }
  const steps = shortestPath(fromId, toId, links, unions);
  if (!steps) {
    return { kind: "unrelated", label: "Not linked", steps: [], crumbs: [] };
  }
  return {
    kind: "related",
    label: labelPath(steps, to.gender),
    steps,
    crumbs: toCrumbs(steps, from, people),
  };
}

function shortestPath(
  fromId: string,
  toId: string,
  links: ParentChild[],
  unions: Union[],
): PathStep[] | null {
  const adj = buildAdj(links, unions);
  const queue = [fromId];
  const prev = new Map<string, PathStep | null>();
  prev.set(fromId, null);

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of adj.get(current) ?? []) {
      if (prev.has(edge.toId)) continue;
      const step: PathStep = {
        fromId: current,
        toId: edge.toId,
        kind: edge.kind,
        linkType: edge.linkType,
      };
      prev.set(edge.toId, step);
      if (edge.toId === toId) {
        const path: PathStep[] = [];
        let walk: string | null = toId;
        while (walk && walk !== fromId) {
          const found = prev.get(walk);
          if (!found) break;
          path.push(found);
          walk = found.fromId;
        }
        path.reverse();
        return path;
      }
      queue.push(edge.toId);
    }
  }
  return null;
}

function buildAdj(links: ParentChild[], unions: Union[]): Map<string, Adj[]> {
  const map = new Map<string, Adj[]>();
  const push = (from: string, edge: Adj) => {
    const list = map.get(from) ?? [];
    list.push(edge);
    map.set(from, list);
  };
  for (const link of links) {
    if (link.parentId === link.childId) continue;
    push(link.childId, { toId: link.parentId, kind: "parent", linkType: link.type });
    push(link.parentId, { toId: link.childId, kind: "child", linkType: link.type });
  }
  for (const union of unions) {
    if (union.partner1Id === union.partner2Id) continue;
    push(union.partner1Id, { toId: union.partner2Id, kind: "spouse" });
    push(union.partner2Id, { toId: union.partner1Id, kind: "spouse" });
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.toId.localeCompare(b.toId) || a.kind.localeCompare(b.kind));
  }
  return map;
}

function labelPath(steps: PathStep[], targetGender: Gender): string {
  const key = steps.map((step) => step.kind).join(">");
  switch (key) {
    case "spouse":
      return "Spouse";
    case "parent":
      return "Parent";
    case "child":
      return "Child";
    case "parent>parent":
      return "Grandparent";
    case "child>child":
      return "Grandchild";
    case "parent>parent>parent":
      return "Great-Grandparent";
    case "child>child>child":
      return "Great-Grandchild";
    case "parent>child":
      return "Sibling";
    case "parent>parent>child":
      return auntUncle(targetGender);
    case "parent>child>child":
      return nieceNephew(targetGender);
    case "parent>parent>child>child":
      return "First Cousin";
    case "spouse>parent":
      return "Parent-in-Law";
    case "child>spouse":
      return "Child-in-Law";
    case "parent>child>spouse":
    case "spouse>parent>child":
      return "Sibling-in-Law";
    default:
      return "Extended Relative";
  }
}

function auntUncle(gender: Gender): string {
  if (gender === "FEMALE") return "Aunt";
  if (gender === "MALE") return "Uncle";
  return "Aunt/Uncle";
}

function nieceNephew(gender: Gender): string {
  if (gender === "FEMALE") return "Niece";
  if (gender === "MALE") return "Nephew";
  return "Niece/Nephew";
}

function toCrumbs(steps: PathStep[], from: Person, people: Person[]): Crumb[] {
  const map = new Map(people.map((person) => [person.id, person]));
  const crumbs: Crumb[] = [{ personId: from.id, name: fullName(from) }];
  for (const step of steps) {
    const person = map.get(step.toId);
    if (!person) break;
    crumbs.push({
      personId: person.id,
      name: fullName(person),
      via: stepWord(step, person.gender),
    });
  }
  return crumbs;
}

function stepWord(step: PathStep, gender: Gender): string {
  if (step.kind === "spouse") {
    if (gender === "MALE") return "Husband";
    if (gender === "FEMALE") return "Wife";
    return "Spouse";
  }
  if (step.kind === "parent") {
    if (step.linkType === "STEP") {
      if (gender === "MALE") return "Stepfather";
      if (gender === "FEMALE") return "Stepmother";
      return "Step-parent";
    }
    if (step.linkType === "ADOPTED") {
      if (gender === "MALE") return "Adoptive father";
      if (gender === "FEMALE") return "Adoptive mother";
      return "Adoptive parent";
    }
    if (gender === "MALE") return "Father";
    if (gender === "FEMALE") return "Mother";
    return "Parent";
  }
  if (step.linkType === "STEP") {
    if (gender === "MALE") return "Stepson";
    if (gender === "FEMALE") return "Stepdaughter";
    return "Stepchild";
  }
  if (step.linkType === "ADOPTED") {
    if (gender === "MALE") return "Adopted son";
    if (gender === "FEMALE") return "Adopted daughter";
    return "Adopted child";
  }
  if (gender === "MALE") return "Son";
  if (gender === "FEMALE") return "Daughter";
  return "Child";
}
