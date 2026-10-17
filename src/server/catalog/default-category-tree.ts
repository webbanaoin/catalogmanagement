// Validate admin-edited global defaults without allowing cross-vertical
// parents, recursive loops or an unsupported fourth level.
export interface DefaultCategoryNode {
  id: string;
  parentId: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export function validateDefaultCategoryParent(
  nodes: readonly DefaultCategoryNode[],
  targetId: string | null,
  parentId: string | null,
): string | null {
  if (!parentId) return null;
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const parent = byId.get(parentId);
  if (!parent) return "Select a parent category from this business type.";
  if (parent.status !== "ACTIVE") return "Choose an active parent category.";
  if (targetId === parentId) return "A category cannot be its own parent.";

  let depth = 1;
  let cursor: string | null = parentId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === targetId || visited.has(cursor)) return "Category hierarchy cannot contain a cycle.";
    visited.add(cursor);
    depth += 1;
    cursor = byId.get(cursor)?.parentId ?? null;
    if (depth > 3) return "Only three category levels are supported.";
  }

  // When moving a parent, include its deepest descendant in the 3-level cap.
  if (targetId) {
    function descendantHeight(id: string, ancestors: Set<string>): number {
      if (ancestors.has(id)) return 100;
      const next = new Set(ancestors);
      next.add(id);
      const children = nodes.filter((item) => item.parentId === id);
      return children.length ? 1 + Math.max(...children.map((child) =>
        descendantHeight(child.id, next))) : 1;
    }
    if (depth + descendantHeight(targetId, new Set()) - 1 > 3) {
      return "Move child categories first: maximum hierarchy depth is three levels.";
    }
  }
  return null;
}
