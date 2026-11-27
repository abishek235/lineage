import { Graph, layout as dagreLayout } from "@dagrejs/dagre";
import { byBirth, cardYears, fullName, initials } from "@/lib/family/format";
import type { PathStep } from "@/lib/family/kinship";
import type { ParentChild, Person, Photo, Union } from "@/lib/family/types";

export const PERSON_W = 248;
export const PERSON_H = 84;
export const UNION_W = 40;
export const UNION_H = 40;

export interface PersonCardData extends Record<string, unknown> {
  name: string;
  years: string;
  initials: string;
  photoId?: string;
  dimmed: boolean;
  onPath: boolean;
}

export interface UnionCardData extends Record<string, unknown> {
  dimmed: boolean;
  onPath: boolean;
}

export interface LayoutNode {
  id: string;
  kind: "person" | "union";
  x: number;
  y: number;
  width: number;
  height: number;
  data: PersonCardData | UnionCardData;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  kind: "child" | "union";
  onPath: boolean;
  dimmed: boolean;
}

export function unionNodeId(id: string): string {
  return `union:${id}`;
}

export function layoutFamily(input: {
  people: Person[];
  links: ParentChild[];
  unions: Union[];
  photos: Photo[];
  steps: PathStep[];
}): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const links = input.links.filter(
    (link) =>
      link.parentId !== link.childId &&
      peopleById.has(link.parentId) &&
      peopleById.has(link.childId),
  );
  const unions = input.unions.filter(
    (union) =>
      union.partner1Id !== union.partner2Id &&
      peopleById.has(union.partner1Id) &&
      peopleById.has(union.partner2Id),
  );
  const highlight = highlightElements(input.steps, links, unions);
  const active = input.steps.length > 0;

  const graph = new Graph({ multigraph: false, compound: false });
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    nodesep: 36,
    ranksep: 78,
    marginx: 28,
    marginy: 28,
  });

  for (const person of input.people) {
    graph.setNode(person.id, { width: PERSON_W, height: PERSON_H });
  }

  const parentsByChild = new Map<string, string[]>();
  for (const link of links) {
    const list = parentsByChild.get(link.childId) ?? [];
    list.push(link.parentId);
    parentsByChild.set(link.childId, list);
  }

  const unionByPair = new Map<string, Union>();
  for (const union of unions) {
    unionByPair.set(`${union.partner1Id}|${union.partner2Id}`, union);
  }

  const childEdges: Array<{ source: string; target: string }> = [];
  const unionEdges: Array<{ source: string; target: string }> = [];
  const covered = new Set<string>();

  for (const union of unions) {
    const id = unionNodeId(union.id);
    graph.setNode(id, { width: UNION_W, height: UNION_H });
    const left = earlier(peopleById, union.partner1Id, union.partner2Id);
    const right = left === union.partner1Id ? union.partner2Id : union.partner1Id;
    unionEdges.push({ source: left, target: id });
    unionEdges.push({ source: right, target: id });
    graph.setEdge(left, id);
    graph.setEdge(right, id);
  }

  for (const [childId, parentIds] of parentsByChild) {
    const matched = matchingUnion(parentIds, unionByPair);
    if (matched) {
      const source = unionNodeId(matched.id);
      childEdges.push({ source, target: childId });
      graph.setEdge(source, childId);
      covered.add(`${matched.partner1Id}|${childId}`);
      covered.add(`${matched.partner2Id}|${childId}`);
    }
    for (const parentId of parentIds) {
      if (covered.has(`${parentId}|${childId}`)) continue;
      childEdges.push({ source: parentId, target: childId });
      graph.setEdge(parentId, childId);
    }
  }

  dagreLayout(graph);

  const nodes: LayoutNode[] = [];
  for (const person of input.people) {
    const placed = graph.node(person.id) as { x: number; y: number } | undefined;
    if (!placed) continue;
    const onPath = highlight.nodes.has(person.id);
    nodes.push({
      id: person.id,
      kind: "person",
      x: placed.x - PERSON_W / 2,
      y: placed.y - PERSON_H / 2,
      width: PERSON_W,
      height: PERSON_H,
      data: {
        name: fullName(person),
        years: cardYears(person),
        initials: initials(person.firstName, person.lastName),
        photoId: primaryPhotoId(input.photos, person.id),
        onPath,
        dimmed: active && !onPath,
      },
    });
  }

  for (const union of unions) {
    const id = unionNodeId(union.id);
    const placed = graph.node(id) as { x: number; y: number } | undefined;
    if (!placed) continue;
    const onPath = highlight.nodes.has(id);
    nodes.push({
      id,
      kind: "union",
      x: placed.x - UNION_W / 2,
      y: placed.y - UNION_H / 2,
      width: UNION_W,
      height: UNION_H,
      data: { onPath, dimmed: active && !onPath },
    });
  }

  const edges: LayoutEdge[] = [];
  const pushEdge = (edge: { source: string; target: string }, kind: "child" | "union") => {
    const id = `${edge.source}->${edge.target}`;
    const onPath = highlight.edges.has(id);
    edges.push({
      id,
      source: edge.source,
      target: edge.target,
      kind,
      onPath,
      dimmed: active && !onPath,
    });
  };
  for (const edge of unionEdges) pushEdge(edge, "union");
  for (const edge of childEdges) pushEdge(edge, "child");

  return { nodes, edges };
}

function earlier(people: Map<string, Person>, a: string, b: string): string {
  const pa = people.get(a);
  const pb = people.get(b);
  if (!pa || !pb) return a;
  return byBirth(pa, pb) <= 0 ? a : b;
}

function matchingUnion(parentIds: string[], unionByPair: Map<string, Union>): Union | undefined {
  for (let i = 0; i < parentIds.length; i += 1) {
    for (let j = i + 1; j < parentIds.length; j += 1) {
      const [a, b] = parentIds[i]! < parentIds[j]! ? [parentIds[i]!, parentIds[j]!] : [parentIds[j]!, parentIds[i]!];
      const found = unionByPair.get(`${a}|${b}`);
      if (found) return found;
    }
  }
  return undefined;
}

function primaryPhotoId(photos: Photo[], personId: string): string | undefined {
  const own = photos.filter((photo) => photo.personId === personId);
  return own.find((photo) => photo.isPrimary)?.id ?? own[0]?.id;
}

function highlightElements(steps: PathStep[], links: ParentChild[], unions: Union[]) {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const step of steps) {
    nodes.add(step.fromId);
    nodes.add(step.toId);
    if (step.kind === "spouse") {
      const union = unions.find(
        (item) =>
          (item.partner1Id === step.fromId && item.partner2Id === step.toId) ||
          (item.partner2Id === step.fromId && item.partner1Id === step.toId),
      );
      if (!union) continue;
      const id = unionNodeId(union.id);
      nodes.add(id);
      edges.add(`${union.partner1Id}->${id}`);
      edges.add(`${union.partner2Id}->${id}`);
      continue;
    }
    const parentId = step.kind === "parent" ? step.toId : step.fromId;
    const childId = step.kind === "parent" ? step.fromId : step.toId;
    const others = links
      .filter((link) => link.childId === childId && link.parentId !== parentId)
      .map((link) => link.parentId);
    const union = unions.find(
      (item) =>
        (item.partner1Id === parentId && others.includes(item.partner2Id)) ||
        (item.partner2Id === parentId && others.includes(item.partner1Id)),
    );
    if (union) {
      const id = unionNodeId(union.id);
      nodes.add(id);
      edges.add(`${parentId}->${id}`);
      edges.add(`${id}->${childId}`);
    } else {
      edges.add(`${parentId}->${childId}`);
    }
  }
  return { nodes, edges };
}
