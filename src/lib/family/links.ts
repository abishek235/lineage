import type { ParentChild, Union } from "@/lib/family/types";

export function orderIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function parentsOf(links: ParentChild[], id: string): ParentChild[] {
  return links.filter((link) => link.childId === id);
}

export function childrenOf(links: ParentChild[], id: string): ParentChild[] {
  return links.filter((link) => link.parentId === id);
}

export function ancestorIds(links: ParentChild[], id: string): Set<string> {
  const parents = new Map<string, string[]>();
  for (const link of links) {
    const list = parents.get(link.childId) ?? [];
    list.push(link.parentId);
    parents.set(link.childId, list);
  }
  return walk(parents, id);
}

export function descendantIds(links: ParentChild[], id: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const link of links) {
    const list = children.get(link.parentId) ?? [];
    list.push(link.childId);
    children.set(link.parentId, list);
  }
  return walk(children, id);
}

function walk(next: Map<string, string[]>, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...(next.get(start) ?? [])];
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const id of next.get(current) ?? []) stack.push(id);
  }
  return seen;
}

export function partnersOf(unions: Union[], id: string): Union[] {
  return unions.filter((union) => union.partner1Id === id || union.partner2Id === id);
}

export function otherPartner(union: Union, id: string): string {
  return union.partner1Id === id ? union.partner2Id : union.partner1Id;
}

export function validatePersonDates(
  birth?: string,
  death?: string,
  yearOnly?: boolean,
): string | null {
  if (!birth || !death) return null;
  if (yearOnly) {
    if (death.slice(0, 4) < birth.slice(0, 4)) return "Death is dated before the birth year.";
    return null;
  }
  if (death < birth) return "Death is dated before birth.";
  return null;
}

export function validateParentLink(
  parentId: string,
  childId: string,
  links: ParentChild[],
  unions: Union[],
): string | null {
  if (!parentId || !childId) return "Choose a person.";
  if (parentId === childId) return "A person can't be their own parent.";
  if (links.some((link) => link.parentId === parentId && link.childId === childId)) {
    return "That parent link already exists.";
  }
  if (
    unions.some((union) => {
      const [a, b] = orderIds(parentId, childId);
      return union.partner1Id === a && union.partner2Id === b;
    })
  ) {
    return "They are already partners. Remove the partnership first.";
  }
  if (ancestorIds(links, parentId).has(childId)) return "That would loop the parent line.";
  if (descendantIds(links, parentId).has(childId)) return "That person is already a descendant.";
  return null;
}

export function validateUnion(
  a: string,
  b: string,
  unions: Union[],
  links: ParentChild[],
): string | null {
  if (!a || !b) return "Choose a person.";
  if (a === b) return "Choose two different people.";
  const [p1, p2] = orderIds(a, b);
  if (unions.some((union) => union.partner1Id === p1 && union.partner2Id === p2)) {
    return "That partnership is already recorded.";
  }
  if (
    links.some(
      (link) =>
        (link.parentId === a && link.childId === b) || (link.parentId === b && link.childId === a),
    )
  ) {
    return "They are already linked as parent and child.";
  }
  return null;
}

export function validateUnionDates(start?: string, end?: string): string | null {
  if (start && end && end < start) return "The end date is before the start date.";
  return null;
}
