import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Portrait } from "@/components/photos";
import type { PersonCardData, UnionCardData } from "@/lib/family/layout";
import { cn } from "@/lib/utils";

export type PersonFlowNode = Node<PersonCardData, "person">;
export type UnionFlowNode = Node<UnionCardData, "union">;

export function PersonNodeView({ data }: NodeProps<PersonFlowNode>) {
  return (
    <div
      className={cn(
        "person-card silk-card flex h-full w-full items-center gap-3 rounded-xl border bg-surface px-3 transition-colors duration-200",
        data.onPath ? "border-accent-strong" : "border-line",
        data.dimmed && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Portrait photoId={data.photoId} initials={data.initials} className="size-10 text-sm" />
      <span className="min-w-0">
        <span className="block truncate font-display text-lg leading-tight text-ink">{data.name}</span>
        <span className="mt-1 block truncate text-sm text-muted">{data.years}</span>
      </span>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

export function UnionNodeView({ data }: NodeProps<UnionFlowNode>) {
  return (
    <div
      className={cn(
        "grid h-full w-full place-items-center rounded-full border bg-surface",
        data.onPath ? "border-accent-strong" : "border-accent",
        data.dimmed && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <span className="size-1.5 rounded-full bg-accent-strong" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

export const nodeTypes = {
  person: PersonNodeView,
  union: UnionNodeView,
};
