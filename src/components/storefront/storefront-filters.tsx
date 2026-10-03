import { Button, Field, Input, Select } from "@/components/ui";
import type { PublicCategory } from "@/server/storefront/storefront-data";

export function StorefrontFilters({
  shopSlug,
  categories,
  q,
  categorySlug,
  availability,
}: {
  shopSlug: string;
  categories: PublicCategory[];
  q?: string;
  categorySlug?: string;
  availability?: string;
}) {
  return (
    <form
      action={`/s/${shopSlug}`}
      method="get"
      className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]"
      aria-label="Search and filter products"
    >
      <Field label="Search products" htmlFor="storefront-search">
        <Input
          id="storefront-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search this shop"
        />
      </Field>

      <Field label="Category" htmlFor="storefront-category">
        <Select id="storefront-category" name="category" defaultValue={categorySlug ?? ""}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Availability" htmlFor="storefront-availability">
        <Select id="storefront-availability" name="availability" defaultValue={availability ?? ""}>
          <option value="">Any availability</option>
          <option value="IN_STOCK">In stock</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
          <option value="ON_REQUEST">On request</option>
        </Select>
      </Field>

      <div className="self-end">
        <Button type="submit" className="w-full">
          Apply
        </Button>
      </div>
    </form>
  );
}
