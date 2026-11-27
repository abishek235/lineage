import { useEffect, useMemo, type MouseEvent } from "react";
import {
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useNavigate } from "@tanstack/react-router";
import "@xyflow/react/dist/style.css";
import { layoutFamily, type LayoutNode } from "@/lib/family/layout";
import type { PathStep } from "@/lib/family/kinship";
import type { ParentChild, Person, Photo, Union } from "@/lib/family/types";
import { nodeTypes } from "@/components/tree/nodes";

function toFlow(laid: ReturnType<typeof layoutFamily>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = laid.nodes.map((node: LayoutNode) => ({
    id: node.id,
    type: node.kind,
    position: { x: node.x, y: node.y },
    data: node.data,
    draggable: false,
    selectable: false,
    style: { width: node.width, height: node.height },
  }));
  const edges: Edge[] = laid.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    style: {
      stroke: "var(--edge)",
      strokeWidth: edge.onPath ? 2.25 : 1.25,
      opacity: edge.dimmed ? 0.16 : edge.onPath ? 1 : 0.55,
    },
    markerEnd:
      edge.kind === "child"
        ? { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--edge)" }
        : undefined,
  }));
  return { nodes, edges };
}

function Canvas({
  people,
  links,
  unions,
  photos,
  steps,
}: {
  people: Person[];
  links: ParentChild[];
  unions: Union[];
  photos: Photo[];
  steps: PathStep[];
}) {
  const navigate = useNavigate();
  const flow = useReactFlow();
  const laid = useMemo(
    () => layoutFamily({ people, links, unions, photos, steps }),
    [people, links, unions, photos, steps],
  );
  const initial = useMemo(() => toFlow(laid), [laid]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    const next = toFlow(laid);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [laid, setNodes, setEdges]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 450;
    const frame = { top: 12, right: 72, bottom: 88, left: 12 };
    const pathIds = laid.nodes
      .filter((node) => node.data.onPath)
      .map((node) => ({ id: node.id }));
    const timer = window.setTimeout(() => {
      if (steps.length && pathIds.length) {
        void flow.fitView({ nodes: pathIds, duration, padding: { ...frame, bottom: 128 }, maxZoom: 1.15 });
      } else {
        void flow.fitView({ duration, padding: frame, maxZoom: 1 });
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [flow, laid, steps.length]);

  const onNodeClick = (_event: MouseEvent, node: Node) => {
    if (node.type !== "person") return;
    void navigate({ to: "/people/$personId", params: { personId: node.id } });
  };

  return (
    <ReactFlow
      className="lineage-flow"
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      edgesFocusable={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      minZoom={0.35}
      maxZoom={1.6}
      fitView
      fitViewOptions={{ padding: { top: 12, right: 72, bottom: 88, left: 12 }, maxZoom: 1 }}
    >
      <Controls position="top-right" showInteractive={false} />
    </ReactFlow>
  );
}

export default function FamilyTree(props: {
  people: Person[];
  links: ParentChild[];
  unions: Union[];
  photos: Photo[];
  steps: PathStep[];
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
