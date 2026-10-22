// Product-only representative artwork: no product_images records are created.
// The closest opted-in active category wins. A merchant may explicitly opt in
// a category using its shop image or its platform-provided shared image.
export type CategoryFallbackRow = {
  id: string;
  slug: string;
  parentId: string | null;
  imageStorageKey: string | null;
  visibleAsProductDefault: boolean;
};
export type GlobalFallbackRow = {
  categorySlug: string;
  imageStorageKey: string;
  visibleAsProductDefault: boolean;
};

export function buildCategoryProductFallbacks(
  categories: readonly CategoryFallbackRow[],
  globalMedia: readonly GlobalFallbackRow[],
): Map<string, string> {
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const globalBySlug = new Map(globalMedia.map((item) => [item.categorySlug, item]));
  const result = new Map<string, string>();

  for (const category of categories) {
    let current: CategoryFallbackRow | undefined = category;
    const visited = new Set<string>();
    // Default category nesting supports 3 levels. Bounded traversal also
    // avoids malicious/corrupted cyclic or unbounded parent chains.
    for (let depth = 0; current && depth < 8; depth++) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const global = globalBySlug.get(current.slug);
      if (current.visibleAsProductDefault) {
        const key = current.imageStorageKey ?? global?.imageStorageKey;
        if (key) {
          result.set(category.slug, key);
          break;
        }
      }
      if (global?.visibleAsProductDefault && global.imageStorageKey) {
        result.set(category.slug, global.imageStorageKey);
        break;
      }
      current = current.parentId ? categoryById.get(current.parentId) : undefined;
    }
  }
  return result;
}
