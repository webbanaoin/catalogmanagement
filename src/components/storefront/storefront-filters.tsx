import { Button, Field, Input, Select } from "@/components/ui";
import type { PublicCategory } from "@/server/storefront/storefront-data";

export function StorefrontFilters({
  shopSlug,
  categories,
  catalogGroups,
  catalogGroupLabel,
  primaryFilter,
  q,
  categorySlug,
  catalogGroup,
  attributeValue,
  availability,
}: {
  shopSlug: string;
  categories: PublicCategory[];
  catalogGroups: string[];
  catalogGroupLabel: string;
  primaryFilter: { name: string; label: string; values: string[] } | null;
  q?: string;
  categorySlug?: string;
  catalogGroup?: string;
  attributeValue?: string;
  availability?: string;
}) {
  return (
    <form
      action={`/s/${shopSlug}`}
      method="get"
      className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
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

      {catalogGroups.length > 0 ? (
        <Field label={catalogGroupLabel} htmlFor="storefront-catalog-group">
          <Select
            id="storefront-catalog-group"
            name="group"
            defaultValue={catalogGroup ?? ""}
          >
            <option value="">All {catalogGroupLabel.toLowerCase()}</option>
            {catalogGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

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

      {primaryFilter ? (
        <Field label={primaryFilter.label} htmlFor="storefront-primary-filter">
          <Select
            id="storefront-primary-filter"
            name="spec"
            defaultValue={attributeValue ?? ""}
          >
            <option value="">Any {primaryFilter.label.toLowerCase()}</option>
            {primaryFilter.values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

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
